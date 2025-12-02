#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <AsyncMqttClient.h>
#include <ESPmDNS.h>
#include <WiFiManager.h>
#include <Preferences.h>

/**
 * @brief Gère la connexion WiFi et MQTT pour l'ESP32
 * 
 * Cette classe simplifie la gestion réseau en :
 * - Gérant la connexion WiFi (directe ou via portail)
 * - Configurant et maintenant la connexion MQTT
 * - Permettant la configuration du nom du module via portail WiFi
 */
class NetworkManager {
private:
    // Configuration MQTT (configurable via build flags)
    #ifdef MQTT_SERVER
        static constexpr const char* MQTT_SERVER_ADDR = MQTT_SERVER;
    #else
        static constexpr const char* MQTT_SERVER_ADDR = "growbrain.local";
    #endif
    static constexpr uint16_t MQTT_PORT = 1883;
    
    // Configuration du module
    char moduleName[32];
    char fullTopic[64];
    
    // Client MQTT
    AsyncMqttClient mqttClient;
    Preferences preferences;
    
    // État de connexion
    unsigned long lastReconnectAttempt;
    unsigned long lastWifiReconnectAttempt = 0;
    unsigned long lastConnectionTime = 0;
    unsigned int reconnectAttempts = 0;
    bool shouldSaveConfig = false;
    bool callbacksInitialized = false;
    
    // Constantes de reconnexion
    static constexpr unsigned long WIFI_RECONNECT_INTERVAL = 10000; // 10s
    static constexpr unsigned long WATCHDOG_TIMEOUT = 600000;       // 10 min sans connexion -> reboot

    // Résolution serveur MQTT
    IPAddress mqttServerIP;
    bool mqttUseIP = false;
    
    // Callback pour messages MQTT
    void (*mqttMessageCallback)(char*, uint8_t*, unsigned int) = nullptr;

public:
    void (*onMqttConnectedCallback)() = nullptr;
    void (*onMqttReconnectAttemptCallback)(unsigned int attempt) = nullptr;
    void (*onMqttDisconnectedCallback)(int reason) = nullptr;

    NetworkManager() : lastReconnectAttempt(0) {
        strcpy(moduleName, "Salon"); // Valeur par défaut
        fullTopic[0] = '\0';
        lastConnectionTime = millis(); // Initialiser pour éviter un reboot immédiat
    }

    /**
     * @brief Initialise WiFi et MQTT
     * 
     * Charge la configuration sauvegardée, connecte au WiFi,
     * configure le serveur MQTT et tente la première connexion.
     */
    void begin() {
        loadModuleName();
        connectWiFi();
        setupMDNS();
        configureMQTT();
        setupMqttCallbacks();
        
        if (WiFi.status() == WL_CONNECTED) {
            lastConnectionTime = millis();
            
            delay(500); // Stabilisation WiFi
            reconnectAttempts = 0;
            reconnect();
        }
    }

    /**
     * @brief À appeler dans loop() pour maintenir la connexion MQTT
     */
    void loop() {
        manageWiFi();

        if (WiFi.status() != WL_CONNECTED) return;
        
        if (!mqttClient.connected()) {
            unsigned long now = millis();
            unsigned long interval = calculateBackoff();
            
            if (now - lastReconnectAttempt > interval) {
                lastReconnectAttempt = now;
                reconnectAttempts++;
                reconnect();
            }
        } else {
            reconnectAttempts = 0;
            lastConnectionTime = millis(); // Reset watchdog si MQTT connecté
        }
    }

    /**
     * @brief Gère la reconnexion WiFi et le watchdog
     */
    void manageWiFi() {
        unsigned long now = millis();
        
        if (WiFi.status() == WL_CONNECTED) {
            // On met à jour le watchdog uniquement si on a aussi MQTT (géré dans loop)
            // ou au moins le WiFi si MQTT n'est pas encore configuré/connecté
            if (!mqttClient.connected()) {
                 // Si on a le WiFi mais pas MQTT, on considère qu'on est "en vie" mais on veut MQTT
                 // On ne reset pas lastConnectionTime ici pour forcer un reboot si MQTT ne vient jamais
                 // Sauf si on veut juste le WiFi. Pour l'instant, disons que WiFi suffit pour ne pas rebooter hard,
                 // mais on préfère un système connecté à tout.
                 // Compromis : Si WiFi OK, on reset le watchdog à moitié ? 
                 // Non, gardons la logique : Si pas de connexion utile (WiFi+MQTT) pendant 10min -> Reboot.
                 // Mais si le broker est down, on ne veut pas rebooter le module en boucle ?
                 // Si, car peut-être que le module a un bug stack IP.
                 // Bon, disons : Si WiFi OK, on est content pour le hardware.
                 lastConnectionTime = now; 
            }
            return;
        }

        // Si WiFi déconnecté
        if (now - lastWifiReconnectAttempt > WIFI_RECONNECT_INTERVAL) {
            lastWifiReconnectAttempt = now;
            WiFi.disconnect(); 
            WiFi.reconnect();
        }
        
        // Watchdog global
        if (now - lastConnectionTime > WATCHDOG_TIMEOUT) {
            Serial.println(F("💀 Connection lost for too long (Watchdog), rebooting..."));
            delay(1000);
            ESP.restart();
        }
    }

    /**
     * @brief Définit le callback pour les messages MQTT reçus
     */
    void setCallback(void (*callback)(char*, uint8_t*, unsigned int)) {
        mqttMessageCallback = callback;
        if (strlen(fullTopic) > 0) {
            setupMqttCallbacks();
        }
    }

    /**
     * @brief Publie une valeur CO2
     */
    void publishCO2(int ppm) {
        if (!mqttClient.connected()) {
            return;
        }
        String topic = String(fullTopic) + "/co2";
        mqttClient.publish(topic.c_str(), 0, false, String(ppm).c_str());
    }

    /**
     * @brief Publie une valeur VOC Index
     */
    void publishVocIndex(int vocIndex) {
        if (!mqttClient.connected()) return;
        String topic = String(fullTopic) + "/voc";
        mqttClient.publish(topic.c_str(), 0, false, String(vocIndex).c_str());
    }

    /**
     * @brief Publie une valeur float (température, humidité, etc.)
     */
    void publishValue(const char* suffix, float value) {
        if (!mqttClient.connected()) return;
        String topic = String(fullTopic) + suffix;
        mqttClient.publish(topic.c_str(), 0, false, String(value, 1).c_str());
    }

    /**
     * @brief Publie un message JSON ou texte
     */
    bool publishMessage(const char* suffix, const char* payload, bool retained = false) {
        if (!mqttClient.connected()) return false;
        String topic = String(fullTopic) + suffix;
        return mqttClient.publish(topic.c_str(), 0, retained, payload) > 0;
    }

    // Getters
    const char* getTopicPrefix() { return fullTopic; }
    long getRSSI() { return WiFi.RSSI(); }
    IPAddress getIP() { return WiFi.localIP(); }
    bool isConnected() { return mqttClient.connected(); }
    bool isWifiConnected() { return WiFi.status() == WL_CONNECTED; }

private:
    /**
     * @brief Charge le nom du module depuis les préférences
     */
    void loadModuleName() {
        preferences.begin("sensor_config", false);
        String savedName = preferences.getString("name", "");
        preferences.end();

        if (savedName.length() > 0) {
            savedName.toCharArray(moduleName, sizeof(moduleName));
        }
        
        snprintf(fullTopic, sizeof(fullTopic), "%s", moduleName);
    }

    /**
     * @brief Sauvegarde le nom du module dans les préférences
     */
    void saveModuleName(const char* name) {
        strcpy(moduleName, name);
        snprintf(fullTopic, sizeof(fullTopic), "%s", moduleName);
        
        preferences.begin("sensor_config", false);
        preferences.putString("name", moduleName);
        preferences.end();
    }

    /**
     * @brief Connecte au WiFi (directement ou via portail)
     */
    void connectWiFi() {
        #ifdef WIFI_SSID
            // Connexion directe avec credentials hardcodés
            WiFi.mode(WIFI_STA);
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            
            int attempts = 0;
            // On attend un peu (10s max) mais on ne bloque pas indéfiniment
            while (WiFi.status() != WL_CONNECTED && attempts < 20) {
                delay(500);
                attempts++;
            }
            
            // Pas de reboot ici, on laisse le loop() gérer
        #else
            // Portail WiFi avec configuration du nom du module
            WiFiManagerParameter customModuleName("module_name", "Nom du Module", moduleName, 32);
            
            WiFiManager wifiManager;
            wifiManager.addParameter(&customModuleName);
            wifiManager.setSaveConfigCallback([this]() { this->shouldSaveConfig = true; });
            wifiManager.setTimeout(180);
            
            if (!wifiManager.autoConnect("ESP32-Sensor-Config")) {
                Serial.println(F("WiFi connection failed (timeout), rebooting..."));
                delay(3000);
                ESP.restart(); // Pour le portail, le reboot est plus logique car on attend une interaction utilisateur
            }
            
            // Sauvegarder le nom du module si modifié
            if (shouldSaveConfig) {
                saveModuleName(customModuleName.getValue());
            }
        #endif
    }

    /**
     * @brief Configure mDNS pour la résolution de noms
     */
    void setupMDNS() {
        MDNS.begin("esp32-client");
    }

    /**
     * @brief Configure le serveur MQTT (résolution mDNS si nécessaire)
     */
    void configureMQTT() {
        String serverStr = String(MQTT_SERVER_ADDR);
        
        if (serverStr.endsWith(".local")) {
            // Résolution mDNS
            String host = serverStr;
            host.replace(".local", "");
            mqttServerIP = MDNS.queryHost(host);
            
            if (mqttServerIP != IPAddress(0, 0, 0, 0)) {
                mqttUseIP = true;
                mqttClient.setServer(mqttServerIP, MQTT_PORT);
            } else {
                mqttUseIP = false;
                mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
            }
        } else {
            // Essayer de parser comme IP directe
            if (mqttServerIP.fromString(MQTT_SERVER_ADDR)) {
                mqttUseIP = true;
                mqttClient.setServer(mqttServerIP, MQTT_PORT);
            } else {
                mqttUseIP = false;
                mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
            }
        }
    }

    /**
     * @brief Calcule l'intervalle de backoff exponentiel
     * @return Intervalle en millisecondes (1s, 2s, 4s, max 5s)
     */
    unsigned long calculateBackoff() {
        if (reconnectAttempts == 0) return 1000;
        
        unsigned int shiftAmount = (reconnectAttempts - 1 > 2) ? 2 : (reconnectAttempts - 1);
        unsigned long interval = 1000UL * (1UL << shiftAmount);
        return (interval > 5000UL) ? 5000UL : interval;
    }

    /**
     * @brief Tente de se reconnecter au serveur MQTT
     */
    void reconnect() {
        if (WiFi.status() != WL_CONNECTED) {
            if (onMqttReconnectAttemptCallback) {
                onMqttReconnectAttemptCallback(reconnectAttempts);
            }
            return;
        }
        
        // Re-vérifier l'IP via mDNS si nécessaire (au cas où l'IP du serveur a changé)
        String serverStr = String(MQTT_SERVER_ADDR);
        if (serverStr.endsWith(".local")) {
            String host = serverStr;
            host.replace(".local", "");
            IPAddress newIP = MDNS.queryHost(host);
            if (newIP != IPAddress(0, 0, 0, 0)) {
                if (newIP != mqttServerIP) {
                    mqttServerIP = newIP;
                    mqttClient.setServer(mqttServerIP, MQTT_PORT);
                }
            }
        }
        
        // Afficher dans le monitor ESP32
        Serial.println(F("Connexion to MQTT ..."));
        
        // Callback pour logger la tentative de reconnexion
        if (onMqttReconnectAttemptCallback) {
            onMqttReconnectAttemptCallback(reconnectAttempts);
        }

        String clientId = "ESP32-" + String((uint32_t)random(0xffff), HEX);
        mqttClient.setClientId(clientId.c_str());
        mqttClient.setKeepAlive(60);
        mqttClient.setCleanSession(true);
        
        mqttClient.connect();
    }

    /**
     * @brief Configure les callbacks MQTT (connect, disconnect, message)
     */
    void setupMqttCallbacks() {
        if (callbacksInitialized) return;
        
        // Callback de connexion
        mqttClient.onConnect([this](bool sessionPresent) {
            reconnectAttempts = 0;
            
            // Afficher dans le monitor ESP32
            Serial.println(F("Connexion success"));

            String configTopic = String(fullTopic) + "/sensors/config";
            mqttClient.subscribe(configTopic.c_str(), 1);

            if (onMqttConnectedCallback) {
                onMqttConnectedCallback();
            }
        });

        // Callback de déconnexion
        mqttClient.onDisconnect([this](AsyncMqttClientDisconnectReason reason) {
            if (onMqttDisconnectedCallback) {
                onMqttDisconnectedCallback((int)reason);
            }
        });

        // Callback de message
        mqttClient.onMessage(
            [this](char* topic, char* payload, AsyncMqttClientMessageProperties properties,
                   size_t len, size_t index, size_t total) {
                if (payload == nullptr || len == 0 || !mqttMessageCallback) return;

                uint8_t* payloadCopy = (uint8_t*)malloc(len);
                if (payloadCopy) {
                    memcpy(payloadCopy, payload, len);
                    mqttMessageCallback(topic, payloadCopy, len);
                    free(payloadCopy);
                }
            });
            
        callbacksInitialized = true;
    }
};

#endif // NETWORK_MANAGER_H
