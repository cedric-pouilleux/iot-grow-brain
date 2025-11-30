#include "StatusPublisher.h"
#include "DisplayManager.h"
#include "SystemInfoCollector.h"
#include "esp_ota_ops.h"
#include <WiFi.h>

StatusPublisher::StatusPublisher(NetworkManager& network, HardwareSerial& co2Serial, DHT_Unified& dht) 
    : network(network), sensorReader(co2Serial, dht), dht(dht) {
}

String StatusPublisher::buildSystemJson(const SystemInfo& sysInfo, const String& psramStr) {
    char systemMsg[512];
    snprintf(systemMsg, sizeof(systemMsg), 
        "{"
            "\"rssi\":%ld,"
            "\"memory\":{"
                "\"heap_free_kb\":%d,"
                "\"heap_min_free_kb\":%d"
            "%s"
            "}"
        "}",
        network.getRSSI(),
        sysInfo.heapFree,
        sysInfo.heapMinFree,
        psramStr.c_str()
    );
    return String(systemMsg);
}

void StatusPublisher::publishSystemConfig() {
    if (!network.isConnected()) {
        return;
    }

    IPAddress currentIP = network.getIP();
    String ipStr = currentIP.toString();
    String macStr = WiFi.macAddress();
    SystemInfo sysInfo = SystemInfoCollector::collect();
    String psramStr = SystemInfoCollector::buildPsramJson();

    char systemConfigMsg[768];
    snprintf(systemConfigMsg, sizeof(systemConfigMsg), 
        "{"
            "\"ip\":\"%s\","
            "\"mac\":\"%s\","
            "\"uptime_start\":%lu,"
            "\"flash\":{"
                "\"used_kb\":%d,"
                "\"free_kb\":%d,"
                "\"system_kb\":%d"
            "},"
            "\"memory\":{"
                "\"heap_total_kb\":%d"
            "%s"
            "}"
        "}",
        ipStr.c_str(),
        macStr.c_str(),
        millis() / 1000,
        sysInfo.flashUsed,
        sysInfo.flashFree,
        sysInfo.flashSystemPartitions,
        sysInfo.heapTotal,
        psramStr.c_str()
    );
    
    network.publishMessage("/system/config", systemConfigMsg, true);
}

void StatusPublisher::publishHardwareConfig() {
    if (!network.isConnected()) {
        return;
    }

    SystemInfo sysInfo = SystemInfoCollector::collect();
    String psramStr = SystemInfoCollector::buildPsramJson();
    
    char hardwareConfigMsg[512];
    snprintf(hardwareConfigMsg, sizeof(hardwareConfigMsg), 
        "{"
            "\"chip\":{"
                "\"model\":\"%s\","
                "\"rev\":%d,"
                "\"flash_kb\":%d,"
                "\"cpu_freq_mhz\":%d"
            "}"
        "}",
        ESP.getChipModel(),
        ESP.getChipRevision(),
        sysInfo.flashTotal,
        ESP.getCpuFreqMHz()
    );
    
    network.publishMessage("/hardware/config", hardwareConfigMsg, true);
}

String StatusPublisher::buildSensorStatusJson(int lastCO2Value, float lastTemperature, 
                                              float lastHumidity, bool lastDhtOk) {
    char sensorStatusMsg[400];
    snprintf(sensorStatusMsg, sizeof(sensorStatusMsg), 
        "{"
            "\"co2\":{"
                "\"status\":\"ok\","
                "\"value\":%d"
            "},"
            "\"temperature\":{"
                "\"status\":\"%s\","
                "\"value\":%.1f"
            "},"
            "\"humidity\":{"
                "\"status\":\"%s\","
                "\"value\":%.1f"
            "},"
            "\"pm25\":{"
                "\"status\":\"missing\","
                "\"value\":null"
            "},"
            "\"voc\":{"
                "\"status\":\"missing\","
                "\"value\":null"
            "},"
            "\"pressure\":{"
                "\"status\":\"missing\","
                "\"value\":null"
            "}"
        "}",
        lastCO2Value,
        lastDhtOk ? "ok" : "error",
        lastTemperature,
        lastDhtOk ? "ok" : "error",
        lastHumidity
    );
    return String(sensorStatusMsg);
}

void StatusPublisher::publishSensorConfig() {
    if (!network.isConnected()) {
        return;
    }
    
    // Publier uniquement les modèles des capteurs (sans les intervalles qui sont gérés par le backend)
    // Format: { "co2": { "model": "MH-Z14A" }, "temperature": { "model": "DHT22" }, "humidity": { "model": "DHT22" } }
    char sensorConfigMsg[256];
    snprintf(sensorConfigMsg, sizeof(sensorConfigMsg), 
        "{"
            "\"co2\":{\"model\":\"MH-Z14A\"},"
            "\"temperature\":{\"model\":\"DHT22\"},"
            "\"humidity\":{\"model\":\"DHT22\"}"
        "}"
    );
    
    // Publier avec retained pour que le backend récupère les modèles au démarrage
    network.publishMessage("/sensors/config", sensorConfigMsg, true);
}

void StatusPublisher::publishSystemInfo() {
    if (!network.isConnected()) {
        return;
    }

    SystemInfo sysInfo = SystemInfoCollector::collect();
    String psramStr = SystemInfoCollector::buildPsramJson();
    String systemMsg = buildSystemJson(sysInfo, psramStr);
    
    // Ne pas utiliser retained pour les données dynamiques (rssi, memory change souvent)
    network.publishMessage("/system", systemMsg.c_str(), false);
}

void StatusPublisher::publishSensorStatus(int lastCO2Value, float lastTemperature, 
                                          float lastHumidity, bool lastDhtOk) {
    if (!network.isConnected()) {
        return;
    }

    String sensorStatusMsg = buildSensorStatusJson(lastCO2Value, lastTemperature, 
                                                   lastHumidity, lastDhtOk);
    // Ne pas utiliser retained pour les données dynamiques (valeurs changent souvent)
    network.publishMessage("/sensors/status", sensorStatusMsg.c_str(), false);
}

void StatusPublisher::publishSensorData(int ppm, DisplayManager& display, 
                                         int& lastCO2Value, float& lastTemperature, 
                                         float& lastHumidity, bool& lastDhtOk) {
    DhtReading reading = sensorReader.readDhtSensors();

    display.updateValues(ppm);
    lastCO2Value = ppm;
    lastTemperature = reading.temperature;
    lastHumidity = reading.humidity;
    lastDhtOk = reading.valid;
    
    network.publishCO2(ppm);
    
    if (reading.valid) {
        network.publishValue("/temperature", reading.temperature);
        network.publishValue("/humidity", reading.humidity);
    }
}

