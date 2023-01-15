#include "wavegen.h"
#include "driver/ledc.h"

#define CHANNEL LEDC_CHANNEL_1
#define SPEED_MODE LEDC_LOW_SPEED_MODE
#define DUTY (1)

// PWM timer settings
ledc_timer_config_t timer_conf = {
  .speed_mode = SPEED_MODE,
  .duty_resolution = LEDC_TIMER_8_BIT,
  .timer_num = LEDC_TIMER_1,
  .freq_hz = 4000000,
  .clk_cfg = LEDC_USE_APB_CLK
};

// PWM gpio settings
ledc_channel_config_t channel_conf = {
  .gpio_num = 15,
  .speed_mode = SPEED_MODE,
  .channel = CHANNEL,
  .intr_type = LEDC_INTR_DISABLE,
  .timer_sel = LEDC_TIMER_1,
  .duty = DUTY,
  .hpoint = 0
};

// constructor for waveform generator object
WaveGen::WaveGen(uint8_t analog_switch_pin, uint8_t dac_pin, SPIClass &spi, int8_t sck, int8_t mosi, int8_t ss) {
  // set private variables
  _dac = new AD9833(spi, sck, mosi, ss);
  _analog_switch_pin = analog_switch_pin;
  _dac_pin = dac_pin;
  // set necessary pins as output
  pinMode(_analog_switch_pin, OUTPUT);
  pinMode(_dac_pin, OUTPUT);
  pinMode(15, OUTPUT);

  // start default output for waveform generator: 1kHz sine wave
  sine(1000);
}

// generate sine on AD9833 and set analog switch
void WaveGen::sine(int freq) {
  freq = constrain(freq, MIN_FREQ, MAX_FREQ);
  _dac->setWaveform(freq, _dac->SINE);
  digitalWrite(_analog_switch_pin, LOW);
}

// generate triangle wave on AD9833 and set analog switch
void WaveGen::triangle(int freq) {
  freq = constrain(freq, MIN_FREQ, MAX_FREQ);
  _dac->setWaveform(freq, _dac->TRIANGLE);
  digitalWrite(_analog_switch_pin, LOW);
}

// not fully implemented, as the offset in the circuit is not equal to the DAC voltage
void WaveGen::setOffset(float offset) {
  uint8_t offsetDac = offset / 3.3 * 255;
  offsetDac = constrain(offsetDac, 0, 255);
  Serial.print("writing to DAC pin "), Serial.print(_dac_pin); Serial.print(": "); Serial.println(offsetDac);
  dacWrite(_dac_pin, offsetDac);
}

// generate PWM with ledc ESP library and set analog switch
void WaveGen::square(int freq, float duty) {
  timer_conf.freq_hz = constrain(freq, MIN_FREQ, MAX_FREQ);
  

  esp_err_t result;

  // for low frequencies, the timer must be 13 bit otherwise the frequency cannot be achieved
  if(freq < 1000) {
    timer_conf.duty_resolution = LEDC_TIMER_13_BIT;
    channel_conf.duty = 8192 * (1.0f - duty);
  } else {
    timer_conf.duty_resolution = LEDC_TIMER_8_BIT;
    channel_conf.duty = 256 * (1.0f - duty);
  }

  // set timer config
  result = ledc_timer_config(&timer_conf);
  Serial.print("ledc_timer_config(..) = ");
  if (result == ESP_OK) {
    Serial.println("ESP_OK");
  } else {
    if (result == ESP_ERR_INVALID_ARG) {
      Serial.println("ESP_ERR_INVALID_ARG");
    } else if (result == ESP_FAIL ) {
      Serial.println("ESP_FAIL ");
    } else {
      Serial.println("Unhandled return value");
    }
    while (1) {}
  }

  // set specific I/O config
  result = ledc_channel_config(&channel_conf);
  Serial.print("ledc_channel_config(..) = ");
  if (result == ESP_OK) {
    Serial.println("ESP_OK");
  } else {
    if (result == ESP_ERR_INVALID_ARG) {
      Serial.println("ESP_ERR_INVALID_ARG");
    } else {
      Serial.println("Unhandled return value");
    }
    while (1) {}
  }

  // set duty cycle
  result = ledc_set_duty(SPEED_MODE, CHANNEL, channel_conf.duty);
  Serial.print("ledc_set_duty(..) = ");
  if (result == ESP_OK) {
    Serial.println("ESP_OK");
  } else {
    if (result == ESP_ERR_INVALID_ARG) {
      Serial.println("ESP_ERR_INVALID_ARG");
    } else {
      Serial.println("Unhandled return value");
    }
    while (1) {}
  }

  // ... and enable the new duty cycle
  result = ledc_update_duty(SPEED_MODE, CHANNEL);
  Serial.print("ledc_update_duty(..) = ");
  if (result == ESP_OK) {
    Serial.println("ESP_OK");
  } else {
    if (result == ESP_ERR_INVALID_ARG) {
      Serial.println("ESP_ERR_INVALID_ARG");
    } else {
      Serial.println("Unhandled return value");
    }
    while (1) {}
  }

  // set analog switch to PWM signal
  digitalWrite(_analog_switch_pin, HIGH);
}
