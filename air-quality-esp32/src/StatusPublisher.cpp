#include "StatusPublisher.h"
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
                "\"heapFreeKb\":%d,"
                "\"heapMinFreeKb\":%d"
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
            "\"uptimeStart\":%lu,"
            "\"flash\":{"
                "\"usedKb\":%d,"
                "\"freeKb\":%d,"
                "\"systemKb\":%d"
            "},"
            "\"memory\":{"
                "\"heapTotalKb\":%d"
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
                "\"flashKb\":%d,"
                "\"cpuFreqMhz\":%d"
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
                                              float lastHumidity, bool lastDhtOk, int lastVocValue) {
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
                "\"status\":\"ok\","
                "\"value\":%d"
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
        lastHumidity,
        lastVocValue
    );
    return String(sensorStatusMsg);
}

void StatusPublisher::publishSensorConfig() {
    if (!network.isConnected()) {
        return;
    }
    
    // Publier uniquement les modèles des capteurs (sans les intervalles qui sont gérés par le backend)
    char sensorConfigMsg[256];
    snprintf(sensorConfigMsg, sizeof(sensorConfigMsg), 
        "{"
            "\"co2\":{\"model\":\"MH-Z14A\"},"
            "\"temperature\":{\"model\":\"DHT22\"},"
            "\"humidity\":{\"model\":\"DHT22\"},"
            "\"voc\":{\"model\":\"SGP40\"}"
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
                                          float lastHumidity, bool lastDhtOk, int lastVocValue) {
    if (!network.isConnected()) {
        return;
    }

    String sensorStatusMsg = buildSensorStatusJson(lastCO2Value, lastTemperature, 
                                                   lastHumidity, lastDhtOk, lastVocValue);
    // Ne pas utiliser retained pour les données dynamiques (valeurs changent souvent)
    network.publishMessage("/sensors/status", sensorStatusMsg.c_str(), false);
}

