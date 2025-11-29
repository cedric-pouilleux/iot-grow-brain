#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <AsyncMqttClient.h>
#include <ESPmDNS.h>
#include <WiFiManager.h>
#include <Preferences.h>

class NetworkManager {
private:
    char mqttServer[40];
    char mqttPort[6];
    char moduleName[32];
    char moduleType[20];
    char fullTopic[64];

    AsyncMqttClient mqttClient;
    Preferences preferences;

    unsigned long lastReconnectAttempt;
    bool shouldSaveConfig = false;

    void (*mqttMessageCallback)(char*, uint8_t*, unsigned int) = nullptr;

public:
    void (*onMqttConnectedCallback)() = nullptr;

    NetworkManager() : lastReconnectAttempt(0) {
        strcpy(mqttServer, "growbrain.local");
        strcpy(mqttPort, "1883");
        strcpy(moduleName, "Salon");
        strcpy(moduleType, "climate-module");
        fullTopic[0] = '\0';
    }

    void begin() {
        // Charger la config sauvegardée
        preferences.begin("sensor_config", false);
        String savedName   = preferences.getString("name", "");
        String savedServer = preferences.getString("server", "");
        preferences.end();

        if (savedName.length() > 0) {
            savedName.toCharArray(moduleName, sizeof(moduleName));
        }

        if (savedServer.length() > 0) {
            savedServer.toCharArray(mqttServer, sizeof(mqttServer));
        }

        snprintf(fullTopic, sizeof(fullTopic), "home/%s", moduleName);

        // --- WiFi & portail de config ---
        WiFiManager wifiManager;
        WiFiManagerParameter custom_module_name(
            "name",
            "Module Name (e.g. Salon)",
            moduleName,
            sizeof(moduleName)
        );
        WiFiManagerParameter custom_mqtt_server(
            "server",
            "MQTT Server (Expert)",
            mqttServer,
            sizeof(mqttServer)
        );

        wifiManager.addParameter(&custom_module_name);
        wifiManager.addParameter(&custom_mqtt_server);

        wifiManager.setSaveConfigCallback([this]() {
            this->shouldSaveConfig = true;
        });

        wifiManager.setTimeout(180);

        if (!wifiManager.autoConnect("ESP32-Sensor-Config")) {
            Serial.println(F("WiFi connection failed, rebooting..."));
            delay(3000);
            ESP.restart();
        }

        Serial.print(F("WiFi Connected - IP: "));
        Serial.println(WiFi.localIP());

        // Sauvegarde éventuelle de la config
        if (shouldSaveConfig) {
            if (strlen(custom_module_name.getValue()) > 0) {
                strcpy(moduleName, custom_module_name.getValue());
            }
            if (strlen(custom_mqtt_server.getValue()) > 0) {
                strcpy(mqttServer, custom_mqtt_server.getValue());
            }

            snprintf(fullTopic, sizeof(fullTopic), "home/%s", moduleName);

            preferences.begin("sensor_config", false);
            preferences.putString("name", moduleName);
            preferences.putString("server", mqttServer);
            preferences.end();
        }

        // --- mDNS ---
        if (!MDNS.begin("esp32-client")) {
            Serial.println(F("mDNS error"));
        }

        // --- Configuration serveur MQTT ---
        uint16_t port = atoi(mqttPort);
        if (port == 0) {
            port = 1883;
        }

        String serverStr = String(mqttServer);
        if (serverStr.endsWith(".local")) {
            // Pour MDNS.queryHost, on enlève le .local
            String host = serverStr;
            host.replace(".local", "");
            IPAddress ip = MDNS.queryHost(host);
            if (ip != IPAddress(0, 0, 0, 0)) {
                mqttClient.setServer(ip, port);
            } else {
                mqttClient.setServer(mqttServer, port);
            }
        } else {
            mqttClient.setServer(mqttServer, port);
        }

        // Callbacks MQTT (doivent être configurés APRÈS setServer et AVANT connect)
        setupMqttCallbacks();

        // Premier essai de connexion immédiat
        reconnect();
    }

    void loop() {
        if (WiFi.status() != WL_CONNECTED) {
            return;
        }

        if (!mqttClient.connected()) {
            unsigned long now = millis();
            if (now - lastReconnectAttempt > 5000) {
                lastReconnectAttempt = now;
                reconnect();
            }
        }
    }

    void setCallback(void (*callback)(char*, uint8_t*, unsigned int)) {
        mqttMessageCallback = callback;

        // Reconfigurer les callbacks si le topic est déjà connu
        if (strlen(fullTopic) > 0) {
            setupMqttCallbacks();
        }
    }

    void reconnect() {
        Serial.println(F("MQTT Reconnecting..."));

        String clientId = "ESP32-" + String((uint32_t)random(0xffff), HEX);
        mqttClient.setClientId(clientId.c_str());
        mqttClient.connect();
    }

    void publishCO2(int ppm) {
        if (!mqttClient.connected()) return;
        String topic = String(fullTopic) + "/co2";
        mqttClient.publish(topic.c_str(), 0, false, String(ppm).c_str());
    }

    void publishValue(const char* suffix, float value) {
        if (!mqttClient.connected()) return;
        String topic = String(fullTopic) + suffix;
        mqttClient.publish(topic.c_str(), 0, false, String(value, 1).c_str());
    }

    bool publishMessage(const char* suffix, const char* payload, bool retained = false) {
        if (!mqttClient.connected()) {
            return false;
        }
        String topic = String(fullTopic) + suffix;
        return mqttClient.publish(topic.c_str(), 0, retained, payload) > 0;
    }

    const char* getTopicPrefix() { return fullTopic; }
    const char* getModuleType() { return moduleType; }
    long getRSSI() { return WiFi.RSSI(); }
    IPAddress getIP() { return WiFi.localIP(); }
    bool isConnected() { return mqttClient.connected(); }
    bool isWifiConnected() { return WiFi.status() == WL_CONNECTED; }

private:
    void setupMqttCallbacks() {
        mqttClient.onConnect([this](bool sessionPresent) {
            Serial.println(F("MQTT Connected"));

            String configTopic = String(fullTopic) + "/sensors/config";
            mqttClient.subscribe(configTopic.c_str(), 1);

            if (onMqttConnectedCallback) {
                onMqttConnectedCallback();
            }
        });

        mqttClient.onDisconnect([this](AsyncMqttClientDisconnectReason reason) {
            Serial.println(F("MQTT Disconnected"));
        });

        mqttClient.onMessage(
            [this](char* topic,
                   char* payload,
                   AsyncMqttClientMessageProperties properties,
                   size_t len,
                   size_t index,
                   size_t total) {
                if (payload == nullptr || len == 0) {
                    return;
                }

                if (mqttMessageCallback) {
                    uint8_t* payloadCopy = (uint8_t*)malloc(len);
                    if (payloadCopy) {
                        memcpy(payloadCopy, payload, len);
                        mqttMessageCallback(topic, payloadCopy, len);
                        free(payloadCopy);
                    }
                }
            });
    }
};

#endif // NETWORK_MANAGER_H
