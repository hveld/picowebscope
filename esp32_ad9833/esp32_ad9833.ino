#include <SPI.h>
#include "ad9833.h"

const uint8_t ad9833_sclk_pin = 17;
const uint8_t ad9833_sdata_pin = 16;
const uint8_t ad9833_fsync_pin = 4;

static SPIClass spi(HSPI);
AD9833 dac(spi, ad9833_sclk_pin, ad9833_sdata_pin, ad9833_fsync_pin);

void setup() {

}

void loop() {
  static int freq = 1000;
  dac.setWaveform(freq, dac.TRIANGLE); //AD9833 サイン波搬送波40kHz　送信
  freq += 100;
  delay(1000);
}
