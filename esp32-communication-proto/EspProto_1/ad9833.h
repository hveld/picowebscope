#include <Arduino.h>
#include <SPI.h>

class AD9833 {
  private:
    int _fsync_pin;
    SPIClass *_spi;

    void Control_Resister_Write(uint16_t b){
      digitalWrite(_fsync_pin, LOW);
      _spi->write16(b);
      digitalWrite(_fsync_pin, HIGH);
    }

  public:
    // constructor
    AD9833(SPIClass &spi, int8_t sck = -1, int8_t mosi = -1, int8_t ss = -1) {
      _fsync_pin = ss;
      pinMode(_fsync_pin, OUTPUT);
      digitalWrite(_fsync_pin, HIGH);
      _spi = &spi;
      _spi->begin(sck, -1, mosi, _fsync_pin);
      _spi->setFrequency(10000000);
      _spi->setDataMode(SPI_MODE2);
      Control_Resister_Write(0b0000000100000000); //AD9833 Reset
    }


    // copied from internet - more info in datasheet AD9833
    const int SINE     = 0b0010000000000000; //0x2000
    const int TRIANGLE = 0b0010000000000010; //0x2000
    void setWaveform(uint32_t frequency, uint16_t Waveform) {
      uint32_t FreqWord = (frequency * pow(2, 28)) / 25000000UL;
      uint16_t MSB = (uint16_t)((FreqWord & 0xFFFC000) >> 14);
      uint16_t LSB = (uint16_t)(FreqWord & 0x3FFF);
      LSB |= 0b0100000000000000; //=0x4000
      MSB |= 0b0100000000000000; //=0x4000
    
      Control_Resister_Write(0b0010000000000000); //制御ワード書き込み
      Control_Resister_Write(LSB);
      Control_Resister_Write(MSB);
      Control_Resister_Write(0b1100000000000000); //位相シフトはゼロ
      Control_Resister_Write(Waveform);
    }
};
