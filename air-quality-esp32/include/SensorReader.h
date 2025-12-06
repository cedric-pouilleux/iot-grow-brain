#ifndef SENSOR_READER_H
#define SENSOR_READER_H

#include <Arduino.h>
#include <DHT_U.h>
#include <Adafruit_SGP40.h>
#include <Adafruit_BMP280.h>
#include "SensorData.h"

class RemoteLogger; // Forward declaration

/**
 * @brief Handles communication with all connected sensors (BMP280, SGP40, DHT, CO2).
 * 
 * Responsible for:
 * - Initialization and re-initialization (reset)
 * - Raw data reading
 * - I2C bus recovery
 * - Remote logging of sensor status
 */
class SensorReader {
public:
    SensorReader(HardwareSerial& co2Serial, DHT_Unified& dht);
    
    /**
     * @brief Injects the logger instance for remote reporting.
     */
    void setLogger(RemoteLogger* logger);

    /**
     * @brief Initializes the BMP280 sensor (Pressure/Temp).
     * @param maxAttempts Number of retries before failing.
     * @return true if successful, false otherwise.
     */
    bool initBMP(int maxAttempts = 3, int delayBetweenMs = 100);

    /**
     * @brief Initializes the SGP40 sensor (VOC).
     * @return true if successful, false otherwise.
     */
    bool initSGP(int maxAttempts = 3, int delayBetweenMs = 100);

    /**
     * @brief Reads CO2 concentration from MH-Z19/14A sensor via Serial.
     * @return CO2 ppm value, or negative error code (-1: timeout, -2: header error, -3: range error).
     */
    int readCO2();

    /**
     * @brief Reads VOC Index from SGP40.
     * Use DHT measurements for compensation if available.
     * @return VOC Index (0-500), or 0 on error.
     */
    int readVocIndex();

    float readPressure();
    float readBMPTemperature();

    /**
     * @brief Resets the BMP280 sensor including I2C bus recovery.
     */
    bool resetBMP();

    /**
     * @brief Resets the SGP40 sensor.
     */
    bool resetSGP();

    void resetDHT();
    void resetCO2();
    DhtReading readDhtSensors();

    /**
     * @brief Manual I2C bus recovery routine.
     * Bit-bangs SCL to drain any stuck slave holding SDA low.
     */
    void recoverI2C();
    
private:
    RemoteLogger* _logger = nullptr;
    HardwareSerial& co2Serial;
    DHT_Unified& dht;
    Adafruit_SGP40 sgp;
    Adafruit_BMP280 bmp;
    static const uint8_t CO2_READ_CMD[9];
};

#endif
