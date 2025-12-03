#include "SensorReader.h"

const uint8_t SensorReader::CO2_READ_CMD[9] = { 0xFF, 0x01, 0x86, 0, 0, 0, 0, 0, 0x79 };

SensorReader::SensorReader(HardwareSerial& co2Serial, DHT_Unified& dht) 
    : co2Serial(co2Serial), dht(dht) {
}

bool SensorReader::begin() {
    bool sgpSuccess = sgp.begin();
    bool bmpSuccess = bmp.begin(0x76); // Adresse I2C par défaut du BMP280 (parfois 0x77)
    
    if (!bmpSuccess) {
        Serial.println("Could not find a valid BMP280 sensor, check wiring!");
    }
    
    return sgpSuccess; // On retourne le statut SGP pour compatibilité, mais on loggue BMP
}

int SensorReader::readVocIndex() {
    sensors_event_t temp, humidity;
    dht.temperature().getEvent(&temp);
    dht.humidity().getEvent(&humidity);
    
    float t = isnan(temp.temperature) ? 25.0 : temp.temperature;
    float h = isnan(humidity.relative_humidity) ? 50.0 : humidity.relative_humidity;
    
    int32_t voc = sgp.measureVocIndex(t, h);
    
    // Debug: print detailed info
    static int readCount = 0;
    readCount++;
    
    if (readCount <= 5 || readCount % 10 == 0) {
        Serial.printf("VOC Reading #%d: value=%d, T=%.1f°C, H=%.1f%%\n", 
                      readCount, voc, t, h);
        if (readCount <= 5) {
            Serial.println("  Note: SGP40 needs 10-15 min warm-up for accurate readings");
        }
    }
    
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

