#include "SensorReader.h"

const uint8_t SensorReader::CO2_READ_CMD[9] = { 0xFF, 0x01, 0x86, 0, 0, 0, 0, 0, 0x79 };

SensorReader::SensorReader(HardwareSerial& co2Serial, DHT_Unified& dht) 
    : co2Serial(co2Serial), dht(dht) {
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

