#include "SystemInitializer.h"
#include <DHT_U.h>
#include <WiFi.h>

void SystemInitializer::initHardware(DisplayManager& display, HardwareSerial& co2Serial, 
                                     DHT_Unified& dht, NetworkManager& network, OtaManager& ota) {
    Serial.begin(115200);
    Serial.println("=== ESP32 CO2 + DHT Sensor ===");
    
    display.begin();
    co2Serial.begin(9600, SERIAL_8N1, 16, 17); // MHZ_RX_PIN, MHZ_TX_PIN
    dht.begin();
    
    display.showMessage("WiFi...", "Connexion...", "Attente Portail");
    network.begin();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WiFi Connected");
        Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("MAC: %s | RSSI: %d dBm\n", WiFi.macAddress().c_str(), WiFi.RSSI());
    }

    ota.begin(generateOtaHostname().c_str());
}

void SystemInitializer::configureSensor(DisplayManager& display) {
    display.showMessage("Initialisation...", "Capteur CO2...", "Capteur DHT...");
    delay(500);
}

void SystemInitializer::runWarmupSequence(DisplayManager& display) {
    display.showMessage("Prechauffage...", "Systeme OK");
    delay(2000);
}

String SystemInitializer::generateOtaHostname() {
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    return "esp32-" + mac.substring(6);
}

