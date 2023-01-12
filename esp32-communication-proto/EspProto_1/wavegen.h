#include <Arduino.h>
#include <SPI.h>
#include "ad9833.h"

#define MIN_FREQ 10
#define MAX_FREQ 500000

class WaveGen {
  private:
    AD9833 *_dac;
    uint8_t _analog_switch_pin, _dac_pin;
  public:
    WaveGen(uint8_t analog_switch_pin, uint8_t dac_pin, SPIClass &spi, int8_t sck = -1, int8_t mosi = -1, int8_t ss = -1);
    void sine(int freq);
    void triangle(int freq);
    void square(int freq, float duty);
    void setOffset(float offset);
};
