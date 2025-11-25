#include <Arduino.h>
#include <Wire.h>
#include "DisplayManager.h"
#include "NetworkManager.h"
#include "secrets.h" // <-- Fichier contenant les mots de passe (ignoré par Git)
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>

#define LCD_ADDR    0x27
#define MHZ_RX_PIN  16  // RX ESP32 (reçoit depuis T du capteur)
#define MHZ_TX_PIN  17  // TX ESP32 (envoie vers R du capteur)
#define DHT_PIN     4   // DATA DHT22
#define DHT_TYPE    DHT22

// Les identifiants WIFI et MQTT sont maintenant dans secrets.h

#define MQTT_TOPIC      "maison/salon/co2"
#define MQTT_TOPIC_TEMP "maison/salon/temperature"
#define MQTT_TOPIC_HUM  "maison/salon/humidity"

DisplayManager display(LCD_ADDR);
HardwareSerial co2Serial(2);
DHT_Unified dht(DHT_PIN, DHT_TYPE);

NetworkManager network(
    WIFI_SSID,
    WIFI_PASSWORD,
    MQTT_SERVER,
    MQTT_PORT,
    MQTT_USER,
    MQTT_PASSWORD,
    MQTT_TOPIC
);

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
    network.begin();
}

void configureSensor() {
    display.showMessage("Initialisation...", "Capteur CO2...", "Capteur DHT...");
    delay(500);
}

void runWarmupSequence() {
    display.showMessage("Prechauffage...", "Connexion WiFi...");

    for (int i = 5; i > 0; i--) { // Court pour le test
        network.loop();
        char buffer[20];
        sprintf(buffer, "%d sec", i);
        const char* wifiStatus = network.isWifiConnected() ? "WiFi: OK" : "WiFi: ...";
        display.showMessage("Prechauffage...", wifiStatus, buffer);
        delay(1000);
    }
}

void processSensorData(int ppm) {
    if (firstValidPpm < 0) {
        firstValidPpm = ppm;
        stabilizationStartTime = millis();
    }

    // Lecture DHT
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

    // Affichage LCD
    display.updateValues(ppm); 

    // Publication MQTT
    network.publishCO2(ppm);
    
    if (dhtOk) {
        network.publishValue(MQTT_TOPIC_TEMP, temperature);
        network.publishValue(MQTT_TOPIC_HUM, humidity);
        Serial.printf("Temp: %.1f C | Hum: %.1f %% \n", temperature, humidity);
    }

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
