#include "SensorReader.h"

const uint8_t SensorReader::CO2_READ_CMD[9] = { 0xFF, 0x01, 0x86, 0, 0, 0, 0, 0, 0x79 };

SensorReader::SensorReader(HardwareSerial& co2Serial, DHT_Unified& dht) 
    : co2Serial(co2Serial), dht(dht) {
}

bool SensorReader::initBMP(int maxAttempts, int delayBetweenMs) {
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        if (bmp.begin(0x76)) {
            if (attempt > 1) {
                Serial.printf("BMP280 initialized after %d attempts\n", attempt);
            }
            return true;
        }
        if (attempt < maxAttempts) {
            delay(delayBetweenMs);
        }
    }
    Serial.println("Could not find a valid BMP280 sensor after retries, check wiring!");
    return false;
}

bool SensorReader::initSGP(int maxAttempts, int delayBetweenMs) {
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        if (sgp.begin()) {
            if (attempt > 1) {
                Serial.printf("SGP40 initialized after %d attempts\n", attempt);
            }
            return true;
        }
        if (attempt < maxAttempts) {
            delay(delayBetweenMs);
        }
    }
    Serial.println("Sensor SGP40 not found after retries :(");
    return false;
}

bool SensorReader::resetBMP() {
    // Send soft reset command to BMP280 (write 0xB6 to register 0xE0)
    Wire.beginTransmission(0x76);
    Wire.write(0xE0);  // Reset register
    Wire.write(0xB6);  // Reset command
    Wire.endTransmission();
    
    delay(100);  // Wait for sensor to reset
    
    // Re-initialize
    bool success = bmp.begin(0x76);
    if (!success) {
        Serial.println("Failed to reset BMP280 sensor!");
    } else {
        Serial.println("BMP280 sensor reset successful (soft reset + re-init)");
    }
    return success;
}

bool SensorReader::resetSGP() {
    bool success = sgp.begin();
    if (!success) {
        Serial.println("Failed to reset SGP40 sensor!");
    } else {
        Serial.println("SGP40 sensor reset successful");
    }
    return success;
}

void SensorReader::resetDHT() {
    dht.begin();
    Serial.println("DHT sensor reset (re-initialized)");
}

void SensorReader::resetCO2() {
    // For MH-Z14A via Serial, we can't hard reset, but we can clear buffers
    while (co2Serial.available()) co2Serial.read();
    Serial.println("CO2 sensor serial buffer cleared");
}

int SensorReader::readVocIndex() {
    sensors_event_t temp, humidity;
    dht.temperature().getEvent(&temp);
    dht.humidity().getEvent(&humidity);
    
    float t = isnan(temp.temperature) ? 25.0 : temp.temperature;
    float h = isnan(humidity.relative_humidity) ? 50.0 : humidity.relative_humidity;
    
    int32_t voc = sgp.measureVocIndex(t, h);
    
    return voc;
}

float SensorReader::readPressure() {
    return bmp.readPressure() / 100.0F; // Conversion Pa -> hPa
}

float SensorReader::readBMPTemperature() {
    return bmp.readTemperature();
}

int SensorReader::readCO2() {
    co2Serial.write(CO2_READ_CMD, 9);
    delay(50);

    if (co2Serial.available() < 9) {
        while (co2Serial.available()) co2Serial.read();
        return -1;
    }

    uint8_t buf[9];
    co2Serial.readBytes(buf, 9);

    if (buf[0] != 0xFF || buf[1] != 0x86) {
        return -2;
    }

    int ppm = buf[2] * 256 + buf[3];
    return (ppm >= 0 && ppm <= 10000) ? ppm : -3;
}

DhtReading SensorReader::readDhtSensors() {
    DhtReading reading = {0.0, 0.0, false};
    sensors_event_t event;

    dht.temperature().getEvent(&event);
    if (!isnan(event.temperature)) {
        reading.temperature = event.temperature;
        reading.valid = true;
    }
    
    dht.humidity().getEvent(&event);
    if (!isnan(event.relative_humidity)) {
        reading.humidity = event.relative_humidity;
    }
    
    return reading;
}

