#ifndef SENSOR_READER_H
#define SENSOR_READER_H

#include <Arduino.h>
#include <DHT_U.h>
#include "SensorData.h"

class SensorReader {
public:
    SensorReader(HardwareSerial& co2Serial, DHT_Unified& dht);
    
    int readCO2();
    DhtReading readDhtSensors();
    
private:
    HardwareSerial& co2Serial;
    DHT_Unified& dht;
    static const uint8_t CO2_READ_CMD[9];
};

#endif

