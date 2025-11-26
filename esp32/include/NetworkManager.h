#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <PubSubClient.h>
#include <ESPmDNS.h>
#include <WiFiManager.h>
#include <Preferences.h>

class NetworkManager {
private:
    // Paramètres (stockés en mémoire)
    char mqttServer[40]; 
    char mqttPort[6];
    char moduleName[32]; 
    char moduleType[20]; 
    
    char fullTopic[64]; 

    WiFiClient espClient;
    PubSubClient client;
    Preferences preferences; 

    unsigned long lastReconnectAttempt;
    bool shouldSaveConfig = false;

public:
    NetworkManager() 
        : client(espClient), lastReconnectAttempt(0) {
        // Valeurs par défaut mises à jour pour la PROD
        strcpy(mqttServer, "growbrain.local"); 
        strcpy(mqttPort, "1883");
        strcpy(moduleName, "Salon");
        strcpy(moduleType, "climate-module");
    }

    void begin() {
        preferences.begin("sensor_config", false);
        String savedName = preferences.getString("name", "");
        String savedServer = preferences.getString("server", "");
        
        if (savedName.length() > 0) savedName.toCharArray(moduleName, 32);
        
        if (savedServer.length() > 0) {
            // Petite astuce dev : Si la config sauvée est une ancienne valeur erronée, on corrige
            if (savedServer == "raspberrypi.local" || savedServer == "DESKTOP-QTHR07R.local") {
                Serial.println("⚠️ Correction config: Ancien serveur -> growbrain.local");
                strcpy(mqttServer, "growbrain.local");
                // On force la sauvegarde plus tard
                shouldSaveConfig = true; 
            } else {
                savedServer.toCharArray(mqttServer, 40);
            }
        }
        preferences.end();

        snprintf(fullTopic, 64, "home/%s", moduleName);

        WiFiManager wifiManager;
        
        WiFiManagerParameter custom_module_name("name", "Nom du Module (ex: Salon)", moduleName, 32);
        WiFiManagerParameter custom_mqtt_server("server", "Serveur MQTT (Expert)", mqttServer, 40);

        wifiManager.addParameter(&custom_module_name);
        wifiManager.addParameter(&custom_mqtt_server);

        wifiManager.setSaveConfigCallback([this]() {
            this->shouldSaveConfig = true;
        });

        wifiManager.setTimeout(180); 
        
        // AutoConnect standard
        if (!wifiManager.autoConnect("ESP32-Sensor-Config")) {
            delay(3000);
            ESP.restart();
        }

        Serial.println("WiFi Connecte !");

        if (shouldSaveConfig) {
            // Si c'est l'utilisateur qui a changé via le portail
            if (strlen(custom_module_name.getValue()) > 0) {
                strcpy(moduleName, custom_module_name.getValue());
                strcpy(mqttServer, custom_mqtt_server.getValue());
            }
            
            snprintf(fullTopic, 64, "home/%s", moduleName);

            Serial.println("Sauvegarde config...");
            preferences.begin("sensor_config", false);
            preferences.putString("name", moduleName);
            preferences.putString("server", mqttServer);
            preferences.end();
        }

        if (!MDNS.begin("esp32-client")) {
            Serial.println("Erreur mDNS");
        }

        int port = atoi(mqttPort);
        client.setServer(mqttServer, port); 
        client.setBufferSize(2048);
    }

    // ... le reste ne change pas ...
    void loop() {
        if (WiFi.status() != WL_CONNECTED) return;
        if (!client.connected()) {
            unsigned long now = millis();
            if (now - lastReconnectAttempt > 5000) {
                lastReconnectAttempt = now;
                reconnect();
            }
        } else {
            client.loop();
        }
    }

    void reconnect() {
        Serial.print("Connexion MQTT vers ");
        Serial.print(mqttServer);
        
        if (String(mqttServer).endsWith(".local")) {
            Serial.print(" (Resolution mDNS...) ");
            IPAddress ip = MDNS.queryHost(mqttServer);
            if (ip != IPAddress(0,0,0,0)) {
                Serial.print(ip);
                client.setServer(ip, 1883); 
            } else {
                Serial.println("Echec resolution !");
                // Fallback : Parfois le mDNS échoue au premier coup, on peut réessayer
                // ou espérer que le réseau propage mieux plus tard
            }
        }
        
        Serial.print(" ... ");

        String clientId = "ESP32-" + String(random(0xffff), HEX);
        if (client.connect(clientId.c_str())) {
            Serial.println("OK");
        } else {
            Serial.print("Echec rc=");
            Serial.print(client.state());
            Serial.println(" (retry 5s)");
        }
    }

    void publishCO2(int ppm) {
        if (!client.connected()) return;
        String topic = String(fullTopic) + "/co2";
        client.publish(topic.c_str(), String(ppm).c_str());
    }

    void publishValue(const char* suffix, float value) {
        if (!client.connected()) return;
        String topic = String(fullTopic) + suffix;
        client.publish(topic.c_str(), String(value, 1).c_str());
    }

    void publishMessage(const char* suffix, const char* payload) {
        if (!client.connected()) return;
        String topic = String(fullTopic) + suffix;
        client.publish(topic.c_str(), payload);
    }

    const char* getTopicPrefix() { return fullTopic; }
    const char* getModuleType() { return moduleType; } 
    
    long getRSSI() { return WiFi.RSSI(); }
    IPAddress getIP() { return WiFi.localIP(); }
    bool isConnected() { return client.connected(); }
    bool isWifiConnected() { return WiFi.status() == WL_CONNECTED; }
};

#endif
