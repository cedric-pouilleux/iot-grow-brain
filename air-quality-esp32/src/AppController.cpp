#include "AppController.h"
#include "SystemInitializer.h"

// Static instance for callbacks
static AppController* instance = nullptr;

// Static callback wrappers
static void staticMqttCallback(char* topic, byte* payload, unsigned int length) {
    if (instance) instance->handleMqttMessage(topic, payload, length);
}

static void staticOnMqttConnected() {
    if (instance) instance->onMqttConnected();
}

static void staticOnMqttReconnect(unsigned int attempt) {
    // Optional logging
}

static void staticOnMqttDisconnected(int reason) {
    // Optional logging
}

AppController::AppController() 
    : co2Serial(2), 
      dht(4, DHT22), 
      sensorReader(co2Serial, dht, Wire1), 
      statusPublisher(network, co2Serial, dht),
      mqttHandler(sensorReader, sensorConfig),
      logger(nullptr) 
{
    instance = this;
}

// ================= INITIALIZATION =================

void AppController::initHardware() {
    SystemInitializer::initHardware(co2Serial, dht, network, ota);
}

void AppController::initNetwork() {
    network.onMqttConnectedCallback = staticOnMqttConnected;
    network.onMqttReconnectAttemptCallback = staticOnMqttReconnect;
    network.onMqttDisconnectedCallback = staticOnMqttDisconnected;
    network.setCallback(staticMqttCallback);
}

void AppController::setupLogger() {
    logger = new RemoteLogger(network, String(network.getTopicPrefix()));
    sensorReader.setLogger(logger);
    mqttHandler.setLogger(logger);

    if (logger) {
        if (WiFi.status() == WL_CONNECTED) {
            char wifiInfo[128];
            snprintf(wifiInfo, sizeof(wifiInfo), "✓ WiFi connected - IP: %s, MAC: %s", 
                     WiFi.localIP().toString().c_str(), WiFi.macAddress().c_str());
            logger->success(wifiInfo);
        }
        char moduleInfo[64];
        snprintf(moduleInfo, sizeof(moduleInfo), "Module: %s", network.getTopicPrefix());
        logger->info(moduleInfo);
    }
}

void AppController::initSensors() {
    SystemInitializer::configureSensor();
    sensorReader.recoverI2C(); // Recovers main Wire (21/22) for BMP280
    
    // Initialize second I2C bus for SGP40
    Wire1.begin(32, 33);
    
    bool sgpOk = sensorReader.initSGP();
    bool bmpOk = sensorReader.initBMP();

    if (logger) {
        if (sgpOk) logger->success("✓ SGP40 initialized");
        else logger->error("✗ SGP40 init failed");
        
        if (bmpOk) logger->success("✓ BMP280 initialized");
        else logger->error("✗ BMP280 init failed");
        
        logger->success("✓ MH-Z14A (CO2) & DHT22 initialized");
        logger->info("System ready - waiting for MQTT connection");
    }

    SystemInitializer::runWarmupSequence();

    // Reset timers for immediate read
    unsigned long now = millis();
    lastCo2ReadTime = now - sensorConfig.co2Interval;
    lastTempReadTime = now - sensorConfig.tempInterval;
    lastHumReadTime = now - sensorConfig.humInterval;
    lastVocReadTime = now - sensorConfig.vocInterval;
    lastPressureReadTime = now - sensorConfig.pressureInterval;
    lastSystemInfoTime = now - 5000;
}

// ================= CORE UPDATE =================

void AppController::updateNetwork() {
    network.loop();
}

void AppController::updateOta() {
    ota.loop();
}

bool AppController::isNetworkReady() {
    return network.isConnected();
}

// ================= SENSOR HANDLERS =================

void AppController::handleMHZ14A() {
    unsigned long now = millis();
    if (now - lastCo2ReadTime >= sensorConfig.co2Interval) {
        lastCo2ReadTime = now;
        int ppm = sensorReader.readCO2();
        if (ppm >= 0) {
            if (firstValidPpm < 0) firstValidPpm = ppm;
            lastCO2Value = ppm;
            network.publishCO2(ppm);
            if (logger) {
                char msg[48]; snprintf(msg, sizeof(msg), "📤 CO2: %d ppm", ppm);
                logger->info(msg);
            }
        } else if (logger) {
            logger->error("✗ CO2 sensor read error");
        }
    }
}

void AppController::handleDHT22() {
    unsigned long now = millis();
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
                    char msg[48]; snprintf(msg, sizeof(msg), "📤 Temperature: %.1f°C", reading.temperature);
                    logger->info(msg);
                }
            }
            if (readHum) {
                lastHumReadTime = now;
                network.publishValue("/humidity", reading.humidity);
                if (logger) {
                    char msg[48]; snprintf(msg, sizeof(msg), "📤 Humidity: %.1f%%", reading.humidity);
                    logger->info(msg);
                }
            }
        }
    }
}

void AppController::handleSGP40() {
    unsigned long now = millis();
    if (now - lastVocReadTime >= sensorConfig.vocInterval) {
        lastVocReadTime = now;
        int voc = sensorReader.readVocIndex();
        lastVocValue = voc;
        network.publishVocIndex(voc);
        if (logger) {
            char msg[32]; snprintf(msg, sizeof(msg), "📤 VOC: %d", voc);
            logger->info(msg);
        }
    }
}

void AppController::handleBMP280() {
    unsigned long now = millis();
    if (now - lastPressureReadTime >= sensorConfig.pressureInterval) {
        lastPressureReadTime = now;
        float pressure = sensorReader.readPressure();
        float tempBmp = sensorReader.readBMPTemperature();
        lastPressure = pressure;
        lastTempBmp = tempBmp;
        network.publishValue("/pressure", pressure);
        network.publishValue("/temperature_bmp", tempBmp);
        if (logger) {
            char msg[96]; snprintf(msg, sizeof(msg), "📤 Pressure: %.1f hPa, TempBMP: %.1f°C", pressure, tempBmp);
            logger->info(msg);
        }
    }
}

void AppController::handleSystemStatus() {
    unsigned long now = millis();
    
    if (mqttJustConnected) {
        mqttJustConnected = false;
        publishAllConfigs();
        if (lastCO2Value > 0) {
            statusPublisher.publishSystemInfo();
            statusPublisher.publishSensorStatus(lastCO2Value, lastTemperature, lastHumidity, lastDhtOk, lastVocValue, lastPressure, lastTempBmp);
            if (lastVocValue > 0) network.publishVocIndex(lastVocValue);
        }
    }

    if (now - lastSystemInfoTime >= 5000) {
        lastSystemInfoTime = now;
        statusPublisher.publishSystemInfo();
        statusPublisher.publishSensorStatus(lastCO2Value, lastTemperature, lastHumidity, lastDhtOk, lastVocValue, lastPressure, lastTempBmp);
    }
}

// ================= HELPERS & LEGACY =================
void AppController::handleMqttMessage(char* topic, byte* payload, unsigned int length) {
    mqttHandler.handleMessage(topic, payload, length);
}

void AppController::onMqttConnected() {
    mqttJustConnected = true;
    if (logger) {
        logger->flushBufferedLogs();
        logger->success("✓ MQTT connected");
    }
    reconnectAttempts = 0;
}

void AppController::publishAllConfigs() {
    statusPublisher.publishHardwareConfig();
    statusPublisher.publishSystemConfig();
    statusPublisher.publishSensorConfig();
    if (logger) logger->debug("Published device configurations");
}
