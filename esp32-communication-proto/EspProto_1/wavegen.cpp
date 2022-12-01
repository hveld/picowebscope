#include "wavegen.h"

WaveGen::WaveGen(uint8_t analog_switch_pin, uint8_t dac_pin, SPIClass &spi, int8_t sck, int8_t mosi, int8_t ss) {
  _dac = new AD9833(spi, sck, mosi, ss);
  _analog_switch_pin = analog_switch_pin;
  _dac_pin = dac_pin;
  pinMode(_analog_switch_pin, OUTPUT);
  pinMode(_dac_pin, OUTPUT);
  _dac->setWaveform(1000, _dac->SINE);
}

void WaveGen::sine(int freq) {
  freq = constrain(freq, MIN_FREQ, MAX_FREQ);
  _dac->setWaveform(freq, _dac->SINE);
  digitalWrite(_analog_switch_pin, LOW);
}


void WaveGen::triangle(int freq) {
  freq = constrain(freq, MIN_FREQ, MAX_FREQ);
  _dac->setWaveform(freq, _dac->TRIANGLE);
  digitalWrite(_analog_switch_pin, LOW);
}
