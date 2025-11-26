#include <Arduino.h>
#include <Wire.h>
#include "DisplayManager.h"
#include "NetworkManager.h"
#include "OtaManager.h"
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>

#define LCD_ADDR    0x27
#define MHZ_RX_PIN  16
#define MHZ_TX_PIN  17
#define DHT_PIN     4
#define DHT_TYPE    DHT22

DisplayManager display(LCD_ADDR);
HardwareSerial co2Serial(2);
DHT_Unified dht(DHT_PIN, DHT_TYPE);
OtaManager ota;

NetworkManager network;

unsigned long lastReadTime = 0;
unsigned long stabilizationStartTime = 0;
int firstValidPpm = -1;
uint8_t cmdRead[9] = { 0xFF, 0x01, 0x86, 0, 0, 0, 0, 0, 0x79 };

int readCO2() {
    co2Serial.write(cmdRead, 9);
    delay(50);

    if (co2Serial.available() < 9) {
        while (co2Serial.available()) co2Serial.read();
        return -1;
    }

    uint8_t buf[9];
    co2Serial.readBytes(buf, 9);

    if (buf[0] != 0xFF || buf[1] != 0x86) {
        return -2;
    }

    int ppm = buf[2] * 256 + buf[3];

    if (ppm < 0 || ppm > 10000) {
        return -3;
    }

    return ppm;
}

void initHardware() { 
    Serial.begin(115200);
    Serial.println("=== Demarrage ESP32 CO2 + DHT ===");
    
    display.begin();
    
    co2Serial.begin(9600, SERIAL_8N1, MHZ_RX_PIN, MHZ_TX_PIN);
    dht.begin();
    
    display.showMessage("WiFi...", "Connexion...", "Attente Portail");
    network.begin();

    String mac = WiFi.macAddress();
    mac.replace(":", "");
    String hostname = "esp32-" + mac.substring(6); 
    ota.begin(hostname.c_str());
}

void configureSensor() {
    display.showMessage("Initialisation...", "Capteur CO2...", "Capteur DHT...");
    delay(500);
}

void runWarmupSequence() {
    display.showMessage("Prechauffage...", "Systeme OK");
    delay(2000);
}

void processSensorData(int ppm) {
    if (firstValidPpm < 0) {
        firstValidPpm = ppm;
        stabilizationStartTime = millis();
    }

    sensors_event_t event;
    float temperature = 0.0;
    float humidity = 0.0;
    bool dhtOk = false;

    dht.temperature().getEvent(&event);
    if (!isnan(event.temperature)) {
        temperature = event.temperature;
        dhtOk = true;
    }
    
    dht.humidity().getEvent(&event);
    if (!isnan(event.relative_humidity)) {
        humidity = event.relative_humidity;
    }

    display.updateValues(ppm); 

    network.publishCO2(ppm);
    
    if (dhtOk) {
        network.publishValue("/temperature", temperature);
        network.publishValue("/humidity", humidity);
        Serial.printf("Temp: %.1f C | Hum: %.1f %% \n", temperature, humidity);
    }

    sensor_t sensor;
    dht.temperature().getSensor(&sensor);

    // Status étendu avec TOUS les capteurs (présents et futurs)
    char statusMsg[2048]; // Buffer augmenté
    snprintf(statusMsg, sizeof(statusMsg), 
        "{"
            "\"type\":\"%s\","
            "\"system\":{"
                "\"ip\":\"%s\","
                "\"mac\":\"%s\","
                "\"rssi\":%ld,"
                "\"uptime\":%lu,"
                "\"chip\":{\"model\":\"%s\",\"rev\":%d,\"flash_kb\":%d}"
            "},"
            "\"sensors\":{"
                "\"co2\":{"
                    "\"status\":\"ok\","
                    "\"value\":%d,"
                    "\"unit\":\"ppm\","
                    "\"model\":\"MH-Z19B\""
                "},"
                "\"temperature\":{"
                    "\"status\":\"%s\","
                    "\"value\":%.1f,"
                    "\"unit\":\"°C\","
                    "\"model\":\"%s\""
                "},"
                "\"humidity\":{"
                    "\"status\":\"%s\","
                    "\"value\":%.1f,"
                    "\"unit\":\"%%\","
                    "\"model\":\"%s\""
                "},"
                "\"pm25\":{"
                    "\"status\":\"missing\","
                    "\"value\":null,"
                    "\"unit\":\"µg/m³\","
                    "\"model\":\"PMS5003\""
                "},"
                "\"voc\":{"
                    "\"status\":\"missing\","
                    "\"value\":null,"
                    "\"unit\":\"ppb\","
                    "\"model\":\"SGP30\""
                "},"
                "\"pressure\":{"
                    "\"status\":\"missing\","
                    "\"value\":null,"
                    "\"unit\":\"hPa\","
                    "\"model\":\"BMP280\""
                "}"
            "}"
        "}",
        // Type
        network.getModuleType(),
        // System
        network.getIP().toString().c_str(),
        WiFi.macAddress().c_str(),
        network.getRSSI(),
        millis() / 1000,
        ESP.getChipModel(),
        ESP.getChipRevision(),
        ESP.getFlashChipSize() / 1024,
        // Values
        ppm,
        dhtOk ? "ok" : "error",
        temperature,
        sensor.name,
        dhtOk ? "ok" : "error",
        humidity,
        sensor.name
    );
    network.publishMessage("/status", statusMsg);

    if (firstValidPpm > 0) {
        unsigned long elapsed = (millis() - stabilizationStartTime) / 1000;
        int delta = ppm - firstValidPpm;
        Serial.printf("CO2: %d ppm | Temps: %lus | Delta: %+d ppm | MQTT: %s\n", ppm, elapsed, delta, network.isConnected() ? "OK" : "KO");
    }
}

void handleSensorError() {
    Serial.println("Erreur lecture capteur CO2");
}

void setup() {
    initHardware();
    configureSensor();
    runWarmupSequence();
    display.initMainScreen();
    Serial.println("Systeme pret !");
    lastReadTime = millis() - 60000; 
} 

void loop() {
    network.loop();
    ota.loop();
    unsigned long now = millis();
    if (now - lastReadTime >= 60000) {
        lastReadTime = now;
        int ppm = readCO2();
        if (ppm >= 0) {
            processSensorData(ppm);
        } else { 
            handleSensorError();
        }
    }
}
