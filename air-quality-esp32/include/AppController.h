#ifndef APP_CONTROLLER_H
#define APP_CONTROLLER_H

#include <Arduino.h>
#include <HardwareSerial.h>
#include <DHT_U.h>
#include "NetworkManager.h"
#include "SensorReader.h"
#include "StatusPublisher.h"
#include "OtaManager.h"
#include "MqttHandler.h"
#include "RemoteLogger.h"
#include "SensorData.h"

class AppController {
public:
    AppController();

    void initHardware();
    void initNetwork();
    void setupLogger();
    void initSensors();
    
    // Core loop tasks
    void updateNetwork();
    void updateOta();
    
    // Granular Sensor Handlers (Hardware specific)
    void handleMHZ14A();   // CO2 Sensor
    void handleDHT22();    // Temp/Humidity Sensor
    void handleSGP40();    // VOC Sensor
    void handleSPS30();    // PM Sensor
    void handleBMP280();   // Pressure/Temp Sensor
    void handleSystemStatus(); // System Info
    
    bool isNetworkReady();
    
    // Helpers
    void handleMqttMessage(char* topic, byte* payload, unsigned int length);
    void onMqttConnected();
    
    // Helpers
    NetworkManager& getNetwork() { return network; }

private:
    // Config
    SensorConfig sensorConfig;

    // Hardware Interface
    HardwareSerial co2Serial;
    HardwareSerial sps30Serial;
    DHT_Unified dht;

    // Subsystems
    NetworkManager network;
    OtaManager ota;
    SensorReader sensorReader;
    StatusPublisher statusPublisher;
    MqttHandler mqttHandler;
    
    // Logging (pointer as it relies on network topic)
    RemoteLogger* logger;

    // State / Timers
    unsigned long lastCo2ReadTime = 0;
    unsigned long lastTempReadTime = 0;
    unsigned long lastHumReadTime = 0;
    unsigned long lastVocReadTime = 0;
    unsigned long lastPmReadTime = 0;
    unsigned long lastPressureReadTime = 0;
    unsigned long lastSystemInfoTime = 0;
    unsigned long stabilizationStartTime = 0;
    
    bool mqttJustConnected = false;
    unsigned int reconnectAttempts = 0;

    // Last Values
    int lastCO2Value = 0;
    int lastVocValue = 0;
    float lastTemperature = 0.0;
    float lastHumidity = 0.0;
    float lastPressure = 0.0;
    float lastTempBmp = 0.0;
    float lastPm1 = 0.0;
    float lastPm25 = 0.0;
    float lastPm4 = 0.0;
    float lastPm10 = 0.0;

    
    // Detailed Status ("ok", "warning", "error", "missing")
    String statusDht = "init";
    String statusCo2 = "init";
    String statusVoc = "init";
    String statusPressure = "init";
    String statusTempBmp = "init";
    String statusPm = "init";

    int firstValidPpm = -1;

    void publishAllConfigs();
};

#endif
