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
static unsigned int reconnectAttempts = 0;

void onMqttConnectedCallback() {
    mqttJustConnected = true;
    // Envoyer tous les logs en attente
    if (logger) {
        logger->flushBufferedLogs();
        if (reconnectAttempts > 0) {
            char msg[96];
            snprintf(msg, sizeof(msg), "✓ MQTT reconnected after %u attempts (last disconnect reason: %u)", 
                     reconnectAttempts, lastDisconnectReason);
            logger->success(msg);
        } else {
            logger->success("✓ MQTT connected - logging system operational");
        }
    }
    reconnectAttempts = 0; // Reset counter after successful connection
}

void onMqttReconnectAttemptCallback(unsigned int attempt) {
    reconnectAttempts = attempt;
    // Don't log each attempt - we'll log a summary when connected
}

void onMqttDisconnectedCallback(int reason) {
    lastDisconnectReason = reason;
    // Don't log here - we'll log when reconnected with the summary
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

    
    // Vérifier si c'est une commande de reset
    if (String(topic).endsWith("/sensors/reset")) {
        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, msg);
        
        if (!error && doc.containsKey("sensor")) {
            String sensor = doc["sensor"].as<String>();
            if (logger) {
                char logMsg[64];
                snprintf(logMsg, sizeof(logMsg), "🔄 Received reset command for sensor: %s", sensor.c_str());
                logger->warn(logMsg);
            }
            
            if (sensor == "bmp" || sensor == "pressure" || sensor == "all") {
                sensorReader.resetBMP();
            }
            if (sensor == "sgp" || sensor == "voc" || sensor == "all") {
                sensorReader.resetSGP();
            }
            if (sensor == "dht" || sensor == "temp" || sensor == "humidity" || sensor == "all") {
                sensorReader.resetDHT();
            }
            if (sensor == "co2" || sensor == "all") {
                sensorReader.resetCO2();
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
        // Informations WiFi
        if (WiFi.status() == WL_CONNECTED) {
            char wifiInfo[128];
            snprintf(wifiInfo, sizeof(wifiInfo), "✓ WiFi connected - IP: %s, MAC: %s, RSSI: %d dBm", 
                     WiFi.localIP().toString().c_str(), WiFi.macAddress().c_str(), WiFi.RSSI());
            logger->success(wifiInfo);
        } else {
            logger->warn("⚠ WiFi not connected at startup");
        }
        
        // Informations module
        char moduleInfo[64];
        snprintf(moduleInfo, sizeof(moduleInfo), "Module: %s, Topic prefix: %s", 
                 network.getTopicPrefix(), network.getTopicPrefix());
        logger->info(moduleInfo);
        
        // Informations mémoire
        char memInfo[64];
        snprintf(memInfo, sizeof(memInfo), "Memory: %d KB free / %d KB total", 
                 ESP.getFreeHeap() / 1024, ESP.getHeapSize() / 1024);
        logger->info(memInfo);
    }
    
    SystemInitializer::configureSensor();
    
    // Initialize I2C bus
    Wire.begin(21, 22); // SDA=21, SCL=22
    
    // Initialize sensors individually with retry logic
    bool sgpOk = sensorReader.initSGP();
    bool bmpOk = sensorReader.initBMP();
    
    // Log each sensor status
    if (logger) {
        // SGP40 (VOC sensor)
        if (sgpOk) {
            logger->success("✓ SGP40 (VOC) initialized - I2C addr: 0x59, protocol: I2C");
        } else {
            logger->error("✗ SGP40 (VOC) init failed - I2C addr: 0x59, check wiring");
        }
        
        // BMP280 (Pressure/Temp sensor)
        if (bmpOk) {
            logger->success("✓ BMP280 (Pressure/Temp) initialized - I2C addr: 0x76, protocol: I2C");
        } else {
            logger->error("✗ BMP280 (Pressure/Temp) init failed - I2C addr: 0x76, check wiring");
        }
        
        // MH-Z14A CO2 sensor
        logger->success("✓ MH-Z14A (CO2) initialized - UART2, RX=GPIO16, TX=GPIO17, 9600 baud");
        
        // DHT22 sensor
        logger->success("✓ DHT22 (Temp/Humidity) initialized - GPIO4, 1-Wire protocol");
    }

    SystemInitializer::runWarmupSequence();
    
    // Configuration des intervalles par défaut
    if (logger) {
        char configInfo[128];
        snprintf(configInfo, sizeof(configInfo), "Sensor intervals: CO2=%lus, Temp=%lus, Hum=%lus, VOC=%lus, Pressure=%lus",
                 sensorConfig.co2Interval / 1000, sensorConfig.tempInterval / 1000,
                 sensorConfig.humInterval / 1000, sensorConfig.vocInterval / 1000, sensorConfig.pressureInterval / 1000);
        logger->info(configInfo);
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
                snprintf(msg, sizeof(msg), "📤 CO2: %d ppm", ppm);
                logger->info(msg);
            }
        } else { 
            if (logger) logger->error("✗ CO2 sensor read error");
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
                    snprintf(msg, sizeof(msg), "📤 Temperature: %.1f°C", reading.temperature);
                    logger->info(msg);
                }
            }
            if (readHum) {
                lastHumReadTime = now;
                network.publishValue("/humidity", reading.humidity);
                if (logger) {
                    char msg[48];
                    snprintf(msg, sizeof(msg), "📤 Humidity: %.1f%%", reading.humidity);
                    logger->info(msg);
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
            snprintf(msg, sizeof(msg), "📤 VOC: %d", voc);
            logger->info(msg);
        }

    }

    // --- LECTURE PRESSION & TEMP BMP ---
    // --- LECTURE PRESSION & TEMP BMP ---
    if (now - lastPressureReadTime >= sensorConfig.pressureInterval) {
        lastPressureReadTime = now;
        float pressure = sensorReader.readPressure();
        float tempBmp = sensorReader.readBMPTemperature();
        
        lastPressure = pressure;
        lastTempBmp = tempBmp;
        
        network.publishValue("/pressure", pressure);
        network.publishValue("/temperature_bmp", tempBmp);
        
        if (logger) {
            char msg[96];
            snprintf(msg, sizeof(msg), "📤 Pressure: %.1f hPa, TempBMP: %.1f°C", pressure, tempBmp);
            logger->info(msg);
        }
    }
    
    // On MQTT connection: publish all configs immediately and reset timer
    if (mqttJustConnected) {
        mqttJustConnected = false;
        publishAllConfigs();
        
        if (logger) {
            logger->info("📤 Device configs published (hardware, system, sensors)");
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
                snprintf(msg, sizeof(msg), "📤 Initial status: CO2=%d ppm", lastCO2Value);
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
    }
}
