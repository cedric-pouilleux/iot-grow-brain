#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <PubSubClient.h>

class NetworkManager {
private:
    const char* ssid;
    const char* password;
    const char* mqttServer;
    int mqttPort;
    const char* mqttUser;
    const char* mqttPassword;
    const char* mqttTopic;

    WiFiClient espClient;
    PubSubClient client;

    unsigned long lastReconnectAttempt;

public:
    NetworkManager(const char* wifiSsid, const char* wifiPwd, 
                  const char* mqttHost, int port, 
                  const char* user, const char* pwd, const char* topic)
        : ssid(wifiSsid), password(wifiPwd), 
          mqttServer(mqttHost), mqttPort(port), 
          mqttUser(user), mqttPassword(pwd), mqttTopic(topic),
          client(espClient), lastReconnectAttempt(0) {}

    void begin() {
        WiFi.mode(WIFI_STA);
        WiFi.begin(ssid, password);
        client.setServer(mqttServer, mqttPort);
    }

    void loop() {
        // Gestion état WiFi
        if (WiFi.status() != WL_CONNECTED) {
            static unsigned long lastWifiCheck = 0;
            if (millis() - lastWifiCheck > 1000) {
                Serial.print("WiFi status: ");
                Serial.println(WiFi.status());
                lastWifiCheck = millis();
            }
            return;
        } else {
            // Afficher l'IP une fois connecté (juste pour debug)
            static bool ipDisplayed = false;
            if (!ipDisplayed) {
                Serial.print("WiFi connecte! IP: ");
                Serial.println(WiFi.localIP());
                Serial.print("Ping server MQTT (");
                Serial.print(mqttServer);
                Serial.println(")...");
                ipDisplayed = true;
            }
        }

        if (!client.connected()) {
            long now = millis();
            if (now - lastReconnectAttempt > 5000) {
                lastReconnectAttempt = now;
                reconnect();
            }
        } else {
            client.loop();
        }
    }

    void reconnect() {
        Serial.print("Tentative connexion MQTT... ");
        // Création d'un ID client aléatoire
        String clientId = "ESP32CO2-";
        clientId += String(random(0xffff), HEX);

        if (client.connect(clientId.c_str(), mqttUser, mqttPassword)) {
            Serial.println("connecte");
        } else {
            Serial.print("echec, rc=");
            Serial.print(client.state());
            Serial.println(" nouvelle tentative dans 5s");
        }
    }

    void publishCO2(int ppm) {
        if (client.connected()) {
            char msg[10];
            snprintf(msg, 10, "%d", ppm);
            client.publish(mqttTopic, msg);
        }
    }

    // Nouvelle méthode générique pour envoyer des floats (Temp/Hum)
    void publishValue(const char* topic, float value) {
        if (client.connected()) {
            char msg[10];
            snprintf(msg, 10, "%.1f", value);
            client.publish(topic, msg);
        }
    }
    
    bool isConnected() {
        return client.connected();
    }
    
    bool isWifiConnected() {
        return WiFi.status() == WL_CONNECTED;
    }
};

#endif
