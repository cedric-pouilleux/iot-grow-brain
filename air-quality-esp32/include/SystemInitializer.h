#ifndef SYSTEM_INITIALIZER_H
#define SYSTEM_INITIALIZER_H

#include <Arduino.h>
#include <HardwareSerial.h>
#include <DHT_U.h>
#include "DisplayManager.h"
#include "NetworkManager.h"
#include "OtaManager.h"

class SystemInitializer {
public:
    static void initHardware(DisplayManager& display, HardwareSerial& co2Serial, 
                            DHT_Unified& dht, NetworkManager& network, OtaManager& ota);
    static void configureSensor(DisplayManager& display);
    static void runWarmupSequence(DisplayManager& display);
    static String generateOtaHostname();
};

#endif

