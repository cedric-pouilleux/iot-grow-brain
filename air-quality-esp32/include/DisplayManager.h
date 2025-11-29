#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <LiquidCrystal_I2C.h>
#include <Arduino.h>

class DisplayManager {
private:
    LiquidCrystal_I2C lcd;
    int lastPpm;
    int lastQualityIdx;

public:
    DisplayManager(uint8_t addr) : lcd(addr, 20, 4), lastPpm(-1), lastQualityIdx(-1) {}

    void begin() {
        lcd.init();
        lcd.backlight();
        lcd.clear();
    }

    void showMessage(const char* line1, const char* line2 = "", const char* line3 = "", const char* line4 = "") {
        lcd.clear();
        if (strlen(line1) > 0) { lcd.setCursor(0, 0); lcd.print(line1); }
        if (strlen(line2) > 0) { lcd.setCursor(0, 1); lcd.print(line2); }
        if (strlen(line3) > 0) { lcd.setCursor(0, 2); lcd.print(line3); }
        if (strlen(line4) > 0) { lcd.setCursor(0, 3); lcd.print(line4); }
    }

    void initMainScreen() {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("CO2 : ");
        lcd.setCursor(0, 1);
        lcd.print("Qualite : ");
    }

    void updateValues(int ppm) {
        if (ppm < 0) {
            showError("Erreur Capteur");
            return;
        }

        if (ppm != lastPpm) {
            lcd.setCursor(6, 0);
            lcd.print("       "); // Efface ancienne valeur
            lcd.setCursor(6, 0);
            lcd.print(ppm);
            lcd.print(" ppm");
            lastPpm = ppm;

            updateQuality(ppm);
        }
    }

    void updateQuality(int ppm) {
        int qualityIdx = (ppm < 800) ? 0 : (ppm < 1200) ? 1 : 2;
        if (qualityIdx != lastQualityIdx) {
            const char* quality[] = {"OK", "Moyen", "Mauvais"};
            lcd.setCursor(10, 1);
            lcd.print("         "); // Efface ancienne qualité
            lcd.setCursor(10, 1);
            lcd.print(quality[qualityIdx]);
            lastQualityIdx = qualityIdx;
        }
    }

    void showError(const char* msg) {
        lcd.setCursor(0, 2);
        lcd.print(msg);
    }

    void showStats(unsigned long elapsedSec, int delta) {
        if (abs(delta) > 50) {
            lcd.setCursor(0, 2);
            lcd.print("Temps: "); lcd.print(elapsedSec); lcd.print("s     ");
            lcd.setCursor(0, 3);
            lcd.print("Delta: "); 
            if (delta > 0) lcd.print("+");
            lcd.print(delta); lcd.print(" ppm    ");
        } else {
            lcd.setCursor(0, 2);
            lcd.print("Stabilise          ");
            lcd.setCursor(0, 3);
            lcd.print("                    ");
        }
    }
};

#endif

