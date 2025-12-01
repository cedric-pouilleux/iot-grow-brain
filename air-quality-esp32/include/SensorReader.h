#ifndef SENSOR_READER_H
#define SENSOR_READER_H

#include <Arduino.h>
#include <DHT_U.h>
#include <Adafruit_SGP40.h>
#include "SensorData.h"

class SensorReader {
public:
    SensorReader(HardwareSerial& co2Serial, DHT_Unified& dht);
    
    bool begin();
    int readCO2();
    int readVocIndex();
    DhtReading readDhtSensors();
    
private:
    HardwareSerial& co2Serial;
    DHT_Unified& dht;
    Adafruit_SGP40 sgp;
    static const uint8_t CO2_READ_CMD[9];
};

#endif

