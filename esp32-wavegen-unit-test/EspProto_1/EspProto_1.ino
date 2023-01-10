#include "wavegen.h"

const uint8_t ad9833_sclk_pin = 17;
const uint8_t ad9833_sdata_pin = 16;
const uint8_t ad9833_fsync_pin = 4;
const uint8_t switch_waveform_generator = 25;
const uint8_t dac_offset = 26;
static SPIClass hspi(HSPI);
WaveGen *wavegen;

int freq;
float duty; // 0.0 ... 1.0
char wave;

void setup() {
  Serial.begin(115200);
  wavegen = new WaveGen(switch_waveform_generator, dac_offset, hspi, ad9833_sclk_pin, ad9833_sdata_pin, ad9833_fsync_pin);
  freq = 1000;
  duty = 0.20f;
  wave = 's';
  Serial.println("setup klaar");
}

void loop() {
    if (Serial.available() > 0) {
        // read the incoming string:
        String incomingString = Serial.readString();
    
        // prints the received data
        Serial.print("I received: ");
        Serial.println(incomingString);
        char in[50];
        incomingString.toCharArray(in, 50);
        switch(in[0]) {
            case 'f':
                freq = atoi(in+1);
                break;
            case 'd':
                duty = atoi(in+1)/100.0f;
                break;
            default:
                wave = in[0];
                break;
        }
        switch(wave) {
            case 's':
                wavegen->sine(freq);
                break;
            case 't':
                wavegen->triangle(freq);
                break;
            case 'b':
                wavegen->square(freq, duty);
                break;
        }
    }
}
