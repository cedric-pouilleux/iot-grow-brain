#ifndef SENSOR_DATA_H
#define SENSOR_DATA_H

struct DhtReading {
    float temperature;
    float humidity;
    bool valid;
};

struct SystemInfo {
    int flashTotal;
    int flashUsed;
    int flashFree;
    int flashSystemPartitions;
    int heapTotal;
    int heapFree;
    int heapMinFree;
    float heapUsedPercent;
};

#endif

