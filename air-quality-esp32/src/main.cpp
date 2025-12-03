#include <Arduino.h>
#include "NetworkManager.h"
#include "OtaManager.h"
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
#include "SensorReader.h"
#include "StatusPublisher.h"
#include "SystemInitializer.h"
#include "RemoteLogger.h"
#include <ArduinoJson.h>
#include <Wire.h>
#include <stdio.h>

#define DHT_PIN     4
#define DHT_TYPE    DHT22

#define SYSTEM_INFO_INTERVAL_MS 5000        // 5 seconds (dynamic data: rssi, uptime, memory)

// Configuration des capteurs (par défaut 60s)
struct SensorConfig {
    unsigned long co2Interval = 60000;
    unsigned long tempInterval = 60000;
    unsigned long humInterval = 60000;
    unsigned long vocInterval = 60000;
    unsigned long pressureInterval = 60000;
} sensorConfig;

HardwareSerial co2Serial(2);
DHT_Unified dht(DHT_PIN, DHT_TYPE);
OtaManager ota;
NetworkManager network;
SensorReader sensorReader(co2Serial, dht);
StatusPublisher statusPublisher(network, co2Serial, dht);
RemoteLogger* logger = nullptr;

// Timers indépendants pour chaque capteur
unsigned long lastCo2ReadTime = 0;
unsigned long lastTempReadTime = 0;
unsigned long lastHumReadTime = 0;
unsigned long lastVocReadTime = 0;
unsigned long lastPressureReadTime = 0;

unsigned long lastSystemInfoTime = 0;
unsigned long stabilizationStartTime = 0;
unsigned long bootTime = 0;
int firstValidPpm = -1;
bool mqttJustConnected = false;

int lastCO2Value = 0;
int lastVocValue = 0;
float lastTemperature = 0.0;
float lastHumidity = 0.0;
float lastPressure = 0.0;
float lastTempBmp = 0.0;
bool lastDhtOk = false;
static unsigned int lastDisconnectReason = 0;
static bool disconnectLogged = false;

void onMqttConnectedCallback() {
    mqttJustConnected = true;
    disconnectLogged = false; // Reset le flag de déconnexion
    // Envoyer tous les logs en attente
    if (logger) {
        logger->flushBufferedLogs();
        logger->info("MQTT connected - logging system operational");
    }
}

void onMqttReconnectAttemptCallback(unsigned int attempt) {
    if (logger) {
        char msg[96];
        if (disconnectLogged) {
            // Message combiné avec déconnexion et tentative
            snprintf(msg, sizeof(msg), "MQTT disconnected (reason: %u) - reconnection attempt #%u", 
                     lastDisconnectReason, attempt);
            disconnectLogged = false; // Reset pour éviter de répéter
        } else {
            // Seulement la tentative de reconnexion
            snprintf(msg, sizeof(msg), "MQTT reconnection attempt #%u", attempt);
        }
        logger->warn(msg);
    }
}

void onMqttDisconnectedCallback(int reason) {
    lastDisconnectReason = reason;
    disconnectLogged = true;
    // Le message sera combiné avec la tentative de reconnexion dans onMqttReconnectAttemptCallback
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
            if (logger) {
                char msg[80];
                snprintf(msg, sizeof(msg), "Config parse error: %s", error.f_str());
                logger->error(msg);
            }
            return;
        }

        // Parsing de la config
        if (doc.containsKey("sensors")) {
            JsonObject sensors = doc["sensors"];
            
            if (sensors.containsKey("co2")) {
                unsigned long interval = sensors["co2"]["interval"];
                if (interval >= 5) {
                    sensorConfig.co2Interval = interval * 1000;
                    if (logger) {
                        char msg[64];
                        snprintf(msg, sizeof(msg), "CO2 interval: %lus", interval);
                        logger->info(msg);
                    }
                }
            }
            
            if (sensors.containsKey("temperature")) {
                unsigned long interval = sensors["temperature"]["interval"];
                if (interval >= 5) {
                    sensorConfig.tempInterval = interval * 1000;
                    if (logger) {
                        char msg[64];
                        snprintf(msg, sizeof(msg), "Temperature interval: %lus", interval);
                        logger->info(msg);
                    }
                }
            }
            
            if (sensors.containsKey("humidity")) {
                unsigned long interval = sensors["humidity"]["interval"];
                if (interval >= 5) {
                    sensorConfig.humInterval = interval * 1000;
                    if (logger) {
                        char msg[64];
                        snprintf(msg, sizeof(msg), "Humidity interval: %lus", interval);
                        logger->info(msg);
                    }
                }
            }

            if (sensors.containsKey("voc")) {
                unsigned long interval = sensors["voc"]["interval"];
                if (interval >= 5) {
                    sensorConfig.vocInterval = interval * 1000;
                    if (logger) {
                        char msg[64];
                        snprintf(msg, sizeof(msg), "VOC interval: %lus", interval);
                        logger->info(msg);
                    }
                }
            }

            if (sensors.containsKey("pressure")) {
                unsigned long interval = sensors["pressure"]["interval"];
                if (interval >= 5) {
                    sensorConfig.pressureInterval = interval * 1000;
                    if (logger) {
                        char msg[64];
                        snprintf(msg, sizeof(msg), "Pressure interval: %lus", interval);
                        logger->info(msg);
                    }
                }
            }
        }
    }
}

void handleSensorError() {
    if (logger) logger->error("CO2 sensor read error");
}

void publishAllConfigs() {
    // Publier les configs statiques (hardware, system, et modèles de capteurs)
    statusPublisher.publishHardwareConfig();
    statusPublisher.publishSystemConfig();
    statusPublisher.publishSensorConfig(); // Publie uniquement les modèles (sans intervalles)
    if (logger) {
        logger->debug("Published device configurations (hardware, system, sensors)");
    }
}

void setup() {
    bootTime = millis();
    
    SystemInitializer::initHardware(co2Serial, dht, network, ota);
    
    // Configurer les callbacks MQTT
    network.onMqttConnectedCallback = onMqttConnectedCallback;
    network.onMqttReconnectAttemptCallback = onMqttReconnectAttemptCallback;
    network.onMqttDisconnectedCallback = onMqttDisconnectedCallback;
    network.setCallback(mqttCallback);
    
    // Initialize logger after network to get module name
    logger = new RemoteLogger(network, String(network.getTopicPrefix()));
    
    // Logs de démarrage (seront envoyés une fois MQTT connecté)
    if (logger) {
        logger->info("=== ESP32 Air Quality Sensor Starting ===");
        logger->debug("Hardware initialization complete");
        
        // Informations WiFi
        if (WiFi.status() == WL_CONNECTED) {
            char wifiInfo[128];
            snprintf(wifiInfo, sizeof(wifiInfo), "WiFi connected - IP: %s, MAC: %s, RSSI: %d dBm", 
                     WiFi.localIP().toString().c_str(), WiFi.macAddress().c_str(), WiFi.RSSI());
            logger->info(wifiInfo);
        } else {
            logger->warn("WiFi not connected at startup");
        }
        
        // Informations module
        char moduleInfo[64];
        snprintf(moduleInfo, sizeof(moduleInfo), "Module: %s, Topic: %s", 
                 network.getTopicPrefix(), network.getTopicPrefix());
        logger->debug(moduleInfo);
        
        // Informations mémoire
        char memInfo[64];
        snprintf(memInfo, sizeof(memInfo), "Free heap: %d KB, Total heap: %d KB", 
                 ESP.getFreeHeap() / 1024, ESP.getHeapSize() / 1024);
        logger->debug(memInfo);
    }
    
    SystemInitializer::configureSensor();
    if (logger) logger->debug("Sensor configuration initialized");
    
    // Initialize I2C for SGP40
    Wire.begin(21, 22); // SDA=21, SCL=22
    if (logger) logger->debug("I2C initialized (SDA=21, SCL=22)");
    
    // Initialize SGP40 & BMP280
    if (!sensorReader.begin()) {
        if (logger) logger->error("SGP40/BMP280 init failed! Check wiring");
    } else {
        if (logger) logger->info("SGP40 & BMP280 initialized successfully");
    }
    
    // Initialisation CO2 sensor
    if (logger) logger->debug("CO2 sensor (MH-Z19) initialized on Serial2");
    
    // Initialisation DHT22
    if (logger) logger->debug("DHT22 sensor initialized on pin 4");

    SystemInitializer::runWarmupSequence();
    if (logger) logger->info("Warmup sequence completed");
    
    // Configuration des intervalles par défaut
    if (logger) {
        char configInfo[128];
        snprintf(configInfo, sizeof(configInfo), "Sensor intervals - CO2: %lus, Temp: %lus, Hum: %lus, VOC: %lus, Pres: %lus",
                 sensorConfig.co2Interval / 1000, sensorConfig.tempInterval / 1000,
                 sensorConfig.humInterval / 1000, sensorConfig.vocInterval / 1000, sensorConfig.pressureInterval / 1000);
        logger->debug(configInfo);
    }
    
    if (logger) logger->info("System ready - waiting for MQTT connection");
    
    // Initialiser les timers pour une lecture immédiate
    lastCo2ReadTime = millis() - sensorConfig.co2Interval;
    lastTempReadTime = millis() - sensorConfig.tempInterval;
    lastHumReadTime = millis() - sensorConfig.humInterval;
    lastVocReadTime = millis() - sensorConfig.vocInterval;
    lastPressureReadTime = millis() - sensorConfig.pressureInterval;
    
    lastSystemInfoTime = millis() - SYSTEM_INFO_INTERVAL_MS;
} 

void loop() {
    network.loop();
    ota.loop();
    unsigned long now = millis();
    
    // Ne déclencher les publications que si MQTT est connecté
    if (!network.isConnected()) {
        return;
    }
    
    // --- LECTURE CO2 ---
    if (now - lastCo2ReadTime >= sensorConfig.co2Interval) {
        lastCo2ReadTime = now;
        int ppm = sensorReader.readCO2();
        
        if (ppm >= 0) {
            if (firstValidPpm < 0) {
                firstValidPpm = ppm;
                stabilizationStartTime = millis();
            }
            lastCO2Value = ppm;
            
            network.publishCO2(ppm);
            if (logger) {
                char msg[48];
                snprintf(msg, sizeof(msg), "Published CO2: %d ppm", ppm);
                logger->debug(msg);
            }
        } else { 
            if (logger) logger->error("CO2 sensor read error");
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

        if (reading.valid) {
            if (readTemp) {
                lastTempReadTime = now;
                network.publishValue("/temperature", reading.temperature);
                if (logger) {
                    char msg[48];
                    snprintf(msg, sizeof(msg), "Published temp: %.1f°C", reading.temperature);
                    logger->debug(msg);
                }
            }
            if (readHum) {
                lastHumReadTime = now;
                network.publishValue("/humidity", reading.humidity);
                if (logger) {
                    char msg[48];
                    snprintf(msg, sizeof(msg), "Published humidity: %.1f%%", reading.humidity);
                    logger->debug(msg);
                }
            }
        }
    }
    


    // --- LECTURE VOC ---
    if (now - lastVocReadTime >= sensorConfig.vocInterval) {
        lastVocReadTime = now;
        int voc = sensorReader.readVocIndex();
        
        lastVocValue = voc;
        
        network.publishVocIndex(voc);
        if (logger) {
            char msg[32];
            snprintf(msg, sizeof(msg), "Published VOC: %d", voc);
            logger->debug(msg);
        }
    }

    // --- LECTURE PRESSION & TEMP BMP ---
    if (now - lastPressureReadTime >= sensorConfig.pressureInterval) {
        Serial.println("[DEBUG] Entering BMP280 read block");
        lastPressureReadTime = now;
        float pressure = sensorReader.readPressure();
        float tempBmp = sensorReader.readBMPTemperature();
        
        Serial.printf("[DEBUG] BMP280 values: P=%.1f, T=%.1f\n", pressure, tempBmp);
        
        lastPressure = pressure;
        lastTempBmp = tempBmp;
        
        network.publishValue("/pressure", pressure);
        // On publie aussi la température du BMP sur un topic dédié
        network.publishValue("/temperature_bmp", tempBmp);
        
        if (logger) {
            char msg[64];
            snprintf(msg, sizeof(msg), "Published Pressure: %.1fhPa, TempBMP: %.1f°C", pressure, tempBmp);
            logger->debug(msg);
        }
    }
    
    // On MQTT connection: publish all configs immediately and reset timer
    if (mqttJustConnected) {
        mqttJustConnected = false;
        publishAllConfigs();
        
        if (logger) {
            logger->info("MQTT connected - device registered");
        }
        
        // Publish current status if we have sensor data
        if (lastCO2Value > 0) {
            statusPublisher.publishSystemInfo();
            statusPublisher.publishSensorStatus(lastCO2Value, lastTemperature, 
                                               lastHumidity, lastDhtOk, lastVocValue,
                                               lastPressure, lastTempBmp);
            if (lastVocValue > 0) network.publishVocIndex(lastVocValue);
            lastSystemInfoTime = now;
            if (logger) {
                char msg[48];
                snprintf(msg, sizeof(msg), "Published initial status: CO2=%dppm", lastCO2Value);
                logger->info(msg);
            }
        }
    }
    
    if (now - lastSystemInfoTime >= SYSTEM_INFO_INTERVAL_MS) {
        lastSystemInfoTime = now;
        statusPublisher.publishSystemInfo();
        statusPublisher.publishSensorStatus(lastCO2Value, lastTemperature, 
                                          lastHumidity, lastDhtOk, lastVocValue,
                                          lastPressure, lastTempBmp);
        if (logger) {
            char msg[128];
            if (lastDhtOk) {
                snprintf(msg, sizeof(msg), "System status: RSSI=%lddBm, Mem=%dKB, CO2=%dppm, T=%.1f°C, H=%.1f%%, VOC=%d, P=%.1fhPa, TBMP=%.1f°C",
                         network.getRSSI(), ESP.getFreeHeap() / 1024, lastCO2Value, 
                         lastTemperature, lastHumidity, lastVocValue, lastPressure, lastTempBmp);
            } else {
                snprintf(msg, sizeof(msg), "System status: RSSI=%lddBm, Mem=%dKB, CO2=%dppm, DHT22=error, VOC=%d, P=%.1fhPa, TBMP=%.1f°C",
                         network.getRSSI(), ESP.getFreeHeap() / 1024, lastCO2Value, lastVocValue, lastPressure, lastTempBmp);
            }
            logger->debug(msg);
        }
    }
}
