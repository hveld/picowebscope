#include <SPI.h>
#include "ad9833.h"
 
const uint8_t SCLK_OLED =  17; //SCLK
const uint8_t MOSI_OLED =  16; //MOSI (Master Output Slave Input)
const uint8_t Fsync_PIN = 4;
 
const int SINE = 0b0010000000000000; //0x2000
const float refFreq = 25000000.0;
 
static SPIClass spi(HSPI);
AD9833 dac(Fsync_PIN, spi, SCLK_OLED, 12, MOSI_OLED, Fsync_PIN);

void setup() {
}
//************* メインループ ****************************************
void loop() {
  static int freq = 1000;
  dac.setWaveform(freq, SINE); //AD9833 サイン波搬送波40kHz　送信
  freq += 100;
  delay(1000);

}


//***********************************
// void AD9833_SetFrequency(uint32_t frequency, uint16_t Waveform) {
//   uint32_t FreqWord = (frequency * pow(2, 28)) / refFreq;
 
//   uint16_t MSB = (uint16_t)((FreqWord & 0xFFFC000) >> 14);
//   uint16_t LSB = (uint16_t)(FreqWord & 0x3FFF);
 
//   LSB |= 0b0100000000000000; //=0x4000
//   MSB |= 0b0100000000000000; //=0x4000
 
//   Control_Resister_Write(0b0010000000000000); //制御ワード書き込み
//   Control_Resister_Write(LSB);
//   Control_Resister_Write(MSB);
 
//   Control_Resister_Write(0b1100000000000000); //位相シフトはゼロ
//   Control_Resister_Write(Waveform);
// }
//***********************************************
// void Control_Resister_Write(uint16_t b){
//   digitalWrite(Fsync_PIN, LOW);
//   spi.write16(b);
//   digitalWrite(Fsync_PIN, HIGH);
// }

