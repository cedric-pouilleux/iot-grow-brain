#include <Arduino.h>
#include <Wire.h>
#include "DisplayManager.h"
#include "NetworkManager.h"
#include "OtaManager.h"
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
#include "SensorReader.h"
#include "StatusPublisher.h"
#include "SystemInitializer.h"
#include <ArduinoJson.h>

#define LCD_ADDR    0x27
#define DHT_PIN     4
#define DHT_TYPE    DHT22

#define SYSTEM_INFO_INTERVAL_MS 5000        // 5 seconds (dynamic data: rssi, uptime, memory)
#define CONFIG_REPUBLISH_FAST_MS 30000      // 30 seconds (during first 5 minutes)
#define CONFIG_REPUBLISH_SLOW_MS 3600000    // 1 hour (after 5 minutes)
#define CONFIG_FAST_PERIOD_MS 300000        // 5 minutes

// Configuration des capteurs (par défaut 60s)
struct SensorConfig {
    unsigned long co2Interval = 60000;
    unsigned long tempInterval = 60000;
    unsigned long humInterval = 60000;
} sensorConfig;

DisplayManager display(LCD_ADDR);
HardwareSerial co2Serial(2);
DHT_Unified dht(DHT_PIN, DHT_TYPE);
OtaManager ota;
NetworkManager network;
SensorReader sensorReader(co2Serial, dht);
StatusPublisher statusPublisher(network, co2Serial, dht);

// Timers indépendants pour chaque capteur
unsigned long lastCo2ReadTime = 0;
unsigned long lastTempReadTime = 0;
unsigned long lastHumReadTime = 0;

unsigned long lastSystemInfoTime = 0;
unsigned long lastConfigPublishTime = 0;
unsigned long stabilizationStartTime = 0;
unsigned long bootTime = 0;
int firstValidPpm = -1;
bool mqttJustConnected = false;

int lastCO2Value = 0;
float lastTemperature = 0.0;
float lastHumidity = 0.0;
bool lastDhtOk = false;

void onMqttConnectedCallback() {
    mqttJustConnected = true;
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    // Convertir le payload en string pour le parsing
    char msg[length + 1];
    memcpy(msg, payload, length);
    msg[length] = '\0';

    // Vérifier si c'est une config
    if (String(topic).endsWith("/sensors/config")) {
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, msg);

        if (error) {
            Serial.print(F("deserializeJson() failed: "));
            Serial.println(error.f_str());
            return;
        }

        // Parsing de la config
        if (doc.containsKey("sensors")) {
            JsonObject sensors = doc["sensors"];
            
            if (sensors.containsKey("co2")) {
                unsigned long interval = sensors["co2"]["interval"];
                if (interval >= 5) {
                    sensorConfig.co2Interval = interval * 1000;
                }
            }
            
            if (sensors.containsKey("temperature")) {
                unsigned long interval = sensors["temperature"]["interval"];
                if (interval >= 5) {
                    sensorConfig.tempInterval = interval * 1000;
                }
            }
            
            if (sensors.containsKey("humidity")) {
                unsigned long interval = sensors["humidity"]["interval"];
                if (interval >= 5) {
                    sensorConfig.humInterval = interval * 1000;
                }
            }
        }
    }
}

void handleSensorError() {
    Serial.println("CO2 sensor read error");
}

void publishAllConfigs() {
    // Ne plus publier publishSensorConfig() car cela écrase le message retained du backend
    // Le backend gère maintenant la publication des configs avec retain
    statusPublisher.publishHardwareConfig();
    statusPublisher.publishSystemConfig();
}

void setup() {
    SystemInitializer::initHardware(display, co2Serial, dht, network, ota);
    SystemInitializer::configureSensor(display);
    SystemInitializer::runWarmupSequence(display);
    display.initMainScreen();
    Serial.println("System ready");
    
    bootTime = millis();
    // Initialiser les timers pour une lecture immédiate
    lastCo2ReadTime = millis() - sensorConfig.co2Interval;
    lastTempReadTime = millis() - sensorConfig.tempInterval;
    lastHumReadTime = millis() - sensorConfig.humInterval;
    
    lastSystemInfoTime = millis() - SYSTEM_INFO_INTERVAL_MS;
    lastConfigPublishTime = 0; 
    
    network.onMqttConnectedCallback = onMqttConnectedCallback;
    network.setCallback(mqttCallback);
} 

void loop() {
    network.loop();
    ota.loop();
    unsigned long now = millis();
    
    // --- LECTURE CO2 ---
    if (now - lastCo2ReadTime >= sensorConfig.co2Interval) {
        Serial.println("Time to read CO2...");
        lastCo2ReadTime = now;
        int ppm = sensorReader.readCO2();
        Serial.print("Read CO2: "); Serial.println(ppm);
        
        if (ppm >= 0) {
            if (firstValidPpm < 0) {
                firstValidPpm = ppm;
                stabilizationStartTime = millis();
            }
            lastCO2Value = ppm;
            display.updateValues(ppm);
            
            if (network.isConnected()) {
                network.publishCO2(ppm);
                Serial.println("Published CO2");
            } else {
                Serial.println("MQTT not connected, skipping publish");
            }
        } else { 
            handleSensorError();
        }
    }

    // --- LECTURE DHT (Température & Humidité) ---
    // Note: On lit le capteur si l'un des deux timers expire
    // Mais on ne publie que ce qui est nécessaire
    bool readTemp = (now - lastTempReadTime >= sensorConfig.tempInterval);
    bool readHum = (now - lastHumReadTime >= sensorConfig.humInterval);

    if (readTemp || readHum) {
        DhtReading reading = sensorReader.readDhtSensors();
        lastTemperature = reading.temperature;
        lastHumidity = reading.humidity;
        lastDhtOk = reading.valid;

        if (reading.valid && network.isConnected()) {
            if (readTemp) {
                lastTempReadTime = now;
                network.publishValue("/temperature", reading.temperature);
                Serial.println("Published Temperature");
            }
            if (readHum) {
                lastHumReadTime = now;
                network.publishValue("/humidity", reading.humidity);
                Serial.println("Published Humidity");
            }
        }
    }
    
    // On MQTT connection: publish all configs immediately and reset timer
    if (mqttJustConnected && network.isConnected()) {
        mqttJustConnected = false;
        publishAllConfigs();
        
        // Reset timer
        lastConfigPublishTime = now;
        
        // Publish current status if we have sensor data
        if (lastCO2Value > 0) {
            statusPublisher.publishSystemInfo();
            statusPublisher.publishSensorStatus(lastCO2Value, lastTemperature, 
                                               lastHumidity, lastDhtOk);
            lastSystemInfoTime = now;
        }
    }
    
    if (now - lastSystemInfoTime >= SYSTEM_INFO_INTERVAL_MS) {
        lastSystemInfoTime = now;
        Serial.println("Publishing System Info...");
        statusPublisher.publishSystemInfo();
        statusPublisher.publishSensorStatus(lastCO2Value, lastTemperature, 
                                          lastHumidity, lastDhtOk);
    }
    
    // Smart config republishing
    unsigned long timeSinceBoot = now - bootTime;
    unsigned long republishInterval = (timeSinceBoot < CONFIG_FAST_PERIOD_MS) 
                                       ? CONFIG_REPUBLISH_FAST_MS 
                                       : CONFIG_REPUBLISH_SLOW_MS;
    
    if (now - lastConfigPublishTime >= republishInterval && network.isConnected()) {
        lastConfigPublishTime = now;
        publishAllConfigs();
    }
}
