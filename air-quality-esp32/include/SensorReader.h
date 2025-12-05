#ifndef SENSOR_READER_H
#define SENSOR_READER_H

#include <Arduino.h>
#include <DHT_U.h>
#include <Adafruit_SGP40.h>
#include <Adafruit_BMP280.h>
#include "SensorData.h"

class SensorReader {
public:
    SensorReader(HardwareSerial& co2Serial, DHT_Unified& dht);
    
    bool initBMP(int maxAttempts = 3, int delayBetweenMs = 100);
    bool initSGP(int maxAttempts = 3, int delayBetweenMs = 100);
    int readCO2();
    int readVocIndex();
    float readPressure();
    float readBMPTemperature();
    bool resetBMP();
    bool resetSGP();
    void resetDHT();
    void resetCO2();
    DhtReading readDhtSensors();
    
private:
    HardwareSerial& co2Serial;
    DHT_Unified& dht;
    Adafruit_SGP40 sgp;
    Adafruit_BMP280 bmp;
    static const uint8_t CO2_READ_CMD[9];
};

#endif

