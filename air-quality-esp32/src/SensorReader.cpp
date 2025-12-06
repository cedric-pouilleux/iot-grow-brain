#include "SensorReader.h"
#include <Wire.h>
#include "RemoteLogger.h"

const uint8_t SensorReader::CO2_READ_CMD[9] = { 0xFF, 0x01, 0x86, 0, 0, 0, 0, 0, 0x79 };

SensorReader::SensorReader(HardwareSerial& co2Serial, DHT_Unified& dht) 
    : co2Serial(co2Serial), dht(dht) {
}

void SensorReader::setLogger(RemoteLogger* logger) {
    _logger = logger;
}

bool SensorReader::initBMP(int maxAttempts, int delayBetweenMs) {
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        if (bmp.begin(0x76)) {
            if (attempt > 1) {
                String msg = "BMP280 initialized after " + String(attempt) + " attempts";
                Serial.println(msg);
                if (_logger) _logger->warn(msg);
            }
            return true;
        }
        if (attempt < maxAttempts) {
            delay(delayBetweenMs);
        }
    }
    String msg = "Could not find a valid BMP280 sensor after retries, check wiring!";
    Serial.println(msg);
    if (_logger) _logger->error(msg);
    return false;
}

bool SensorReader::initSGP(int maxAttempts, int delayBetweenMs) {
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        if (sgp.begin()) {
            if (attempt > 1) {
                String msg = "SGP40 initialized after " + String(attempt) + " attempts";
                Serial.println(msg);
                if (_logger) _logger->warn(msg);
            }
            return true;
        }
        if (attempt < maxAttempts) {
            delay(delayBetweenMs);
        }
    }
    String msg = "Sensor SGP40 not found after retries :(";
    Serial.println(msg);
    if (_logger) _logger->error(msg);
    return false;
}

bool SensorReader::resetBMP() {
    String msg = "Performing I2C bus recovery before BMP280 reset...";
    Serial.println(msg);
    if (_logger) _logger->info(msg);
    
    recoverI2C();
    
    // Send soft reset command to BMP280 (write 0xB6 to register 0xE0)
    Wire.beginTransmission(0x76);
    Wire.write(0xE0);  // Reset register
    Wire.write(0xB6);  // Reset command
    Wire.endTransmission();
    
    delay(100);  // Wait for sensor to reset
    
    // Re-initialize
    bool success = bmp.begin(0x76);
    if (!success) {
        String err = "Failed to reset BMP280 sensor!";
        Serial.println(err);
        if (_logger) _logger->error(err);
    } else {
        String ok = "BMP280 sensor reset successful (I2C recovery + soft reset + re-init)";
        Serial.println(ok);
        if (_logger) _logger->success(ok);
    }
    
    // Also re-initialize SGP40 since we did a full I2C bus recovery
    // which effectively disconnected the SGP driver instance
    initSGP();
    
    return success;
}

bool SensorReader::resetSGP() {
    bool success = sgp.begin();
    if (!success) {
        String err = "Failed to reset SGP40 sensor!";
        Serial.println(err);
        if (_logger) _logger->error(err);
    } else {
        String ok = "SGP40 sensor reset successful";
        Serial.println(ok);
        if (_logger) _logger->success(ok);
    }
    return success;
}

void SensorReader::recoverI2C() {
    int sdaPin = 21;
    int sclPin = 22;
    #if defined(SDA) && defined(SCL)
        sdaPin = SDA;
        sclPin = SCL;
    #endif

    String logMsg = "Recovering I2C bus on SDA=" + String(sdaPin) + " SCL=" + String(sclPin) + "...";
    Serial.println(logMsg);
    if (_logger) _logger->warn(logMsg);

    // Libérer le périphérique I2C
    // Try to end Wire to release pins
    // Wire.end() is available on ESP32 Arduino and safe to call
    Wire.end(); 

    // Regarder l'état initial
    pinMode(sdaPin, INPUT);
    pinMode(sclPin, INPUT);
    delayMicroseconds(5);

    int sdaLevel = digitalRead(sdaPin);
    int sclLevel = digitalRead(sclPin);
    Serial.printf("Before recovery: SDA=%d SCL=%d\n", sdaLevel, sclLevel);
    // Logging levels to remote might be too verbose, maybe only if low?
    if (_logger && (sdaLevel == 0 || sclLevel == 0)) {
        _logger->warn("I2C Bus locked before recovery (SDA=" + String(sdaLevel) + " SCL=" + String(sclLevel) + ")");
    }

    // 1) Clock out jusqu'à 9 pulses sur SCL
    pinMode(sclPin, OUTPUT);
    digitalWrite(sclPin, LOW);
    pinMode(sdaPin, INPUT); // SDA laissé en entrée (pull-up externe)

    for (int i = 0; i < 9; i++) {
        digitalWrite(sclPin, HIGH);
        delayMicroseconds(10);
        digitalWrite(sclPin, LOW);
        delayMicroseconds(10);
    }

    // 2) Générer un STOP : SDA LOW -> SDA HIGH pendant SCL HIGH
    pinMode(sdaPin, OUTPUT);
    digitalWrite(sdaPin, LOW);
    delayMicroseconds(10);
    digitalWrite(sclPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(sdaPin, HIGH);
    delayMicroseconds(10);

    // 3) Relâcher les lignes
    pinMode(sdaPin, INPUT);
    pinMode(sclPin, INPUT);
    delayMicroseconds(5);

    // 4) Redémarrer Wire sur les bons pins
    Wire.begin(sdaPin, sclPin);
    Wire.setTimeOut(1000);
    delay(100);

    int sdaAfter = digitalRead(sdaPin);
    int sclAfter = digitalRead(sclPin);
    Serial.printf("After recovery: SDA=%d SCL=%d\n", sdaAfter, sclAfter);

    if (sdaAfter == HIGH && sclAfter == HIGH) {
        String ok = "I2C bus recovery complete.";
        Serial.println(ok);
        if (_logger) _logger->info(ok); // Info level is fine for success
    } else {
        String fail = "I2C bus still stuck after recovery, sensor may be hard-locked.";
        Serial.println(fail);
        if (_logger) _logger->error(fail);
    }
}

void SensorReader::resetDHT() {
    dht.begin();
    String msg = "DHT sensor reset (re-initialized)";
    Serial.println(msg);
    if (_logger) _logger->info(msg);
}

void SensorReader::resetCO2() {
    // For MH-Z14A via Serial, we can't hard reset, but we can clear buffers
    while (co2Serial.available()) co2Serial.read();
    String msg = "CO2 sensor serial buffer cleared";
    Serial.println(msg);
    if (_logger) _logger->info(msg);
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
