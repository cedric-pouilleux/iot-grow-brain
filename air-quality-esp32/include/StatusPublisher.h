#ifndef STATUS_PUBLISHER_H
#define STATUS_PUBLISHER_H

#include <Arduino.h>
#include <HardwareSerial.h>
#include <DHT_U.h>
#include "NetworkManager.h"
#include "SensorData.h"
#include "SensorReader.h"
#include "DisplayManager.h"

class StatusPublisher {
public:
    StatusPublisher(NetworkManager& network, HardwareSerial& co2Serial, DHT_Unified& dht);
    
    void publishSensorData(int ppm, DisplayManager& display, int& lastCO2Value, 
                          float& lastTemperature, float& lastHumidity, bool& lastDhtOk);
    void publishSystemInfo();
    void publishSystemConfig();
    void publishSensorStatus(int lastCO2Value, float lastTemperature, 
                            float lastHumidity, bool lastDhtOk);
    void publishSensorConfig();
    void publishHardwareConfig();
    
private:
    NetworkManager& network;
    SensorReader sensorReader;
    DHT_Unified& dht;
    
    String buildSystemJson(const SystemInfo& sysInfo, const String& psramStr);
    String buildSensorStatusJson(int lastCO2Value, float lastTemperature, 
                                float lastHumidity, bool lastDhtOk);
};

#endif

