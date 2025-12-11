#ifndef SENSOR_READER_H
#define SENSOR_READER_H

#include <Arduino.h>
#include <DHT_U.h>
#include <Adafruit_SGP40.h>
#include <Adafruit_BMP280.h>
#include <SensirionUartSps30.h>
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
    // SGP40 will use the second I2C bus (wireSGP)
    SensorReader(HardwareSerial& co2Serial, HardwareSerial& sps30Serial, DHT_Unified& dht, TwoWire& wireSGP);
    
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
     * @brief Initializes the SPS30 sensor (PM) via UART.
     * @return true if successful, false otherwise.
     */
    bool initSPS30(int maxAttempts = 3, int delayBetweenMs = 100);

    /**
     * @brief Scans an I2C bus and logs found devices.
     * @return Number of devices found.
     */
    int scanI2C(TwoWire& wire, const char* busName);

    /**
     * @brief Reads CO2 concentration from MH-Z19/14A sensor via Serial.
     * @return CO2 ppm value, or negative error code (-1: timeout, -2: header error, -3: range error).
     */
    int readCO2();

    /**
     * @brief Checks if SGP40 is reachable on the I2C bus.
     */
    bool isSGPConnected();

    /**
     * @brief Checks if BMP280 is reachable on the I2C bus.
     */
    bool isBMPConnected();

    /**
     * @brief Reads Voc Index from SGP40.
     * Returns -1 if sensor is disconnected.
     * Use DHT measurements for compensation if available.
     * @return VOC Index (0-500), or -1 on error.
     */
    int readVocIndex();

    /**
     * @brief Reads Pressure from BMP280.
     * Returns NAN if sensor is disconnected.
     */
    float readPressure();

    /**
     * @brief Reads Temperature from BMP280.
     * Returns NAN if sensor is disconnected.
     */
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

    /**
     * @brief Reads PM values from SPS30.
     * @param pm1 Reference to store PM1.0
     * @param pm25 Reference to store PM2.5
     * @param pm4 Reference to store PM4.0
     * @param pm10 Reference to store PM10
     * @return true if read successful, false otherwise
     */
    bool readSPS30(float& pm1, float& pm25, float& pm4, float& pm10);
    
private:
    RemoteLogger* _logger = nullptr;
    HardwareSerial& co2Serial;
    HardwareSerial& sps30Serial;
    DHT_Unified& dht;
    TwoWire& _wireSGP;
    Adafruit_SGP40 sgp;
    Adafruit_BMP280 bmp;
    SensirionUartSps30 sps30;
    static const uint8_t CO2_READ_CMD[9];
};

#endif
