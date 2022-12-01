#include "wavegen.h"
#include "driver/ledc.h"

#define CHANNEL LEDC_CHANNEL_1
#define SPEED_MODE LEDC_LOW_SPEED_MODE
#define DUTY (1)

ledc_timer_config_t timer_conf = {
  .speed_mode = SPEED_MODE,
  .duty_resolution = LEDC_TIMER_8_BIT,
  .timer_num = LEDC_TIMER_1,
  .freq_hz = 4000000,
  .clk_cfg = LEDC_USE_APB_CLK
};

ledc_channel_config_t channel_conf = {
  .gpio_num = 15,
  .speed_mode = SPEED_MODE,
  .channel = CHANNEL,
  .intr_type = LEDC_INTR_DISABLE,
  .timer_sel = LEDC_TIMER_1,
  .duty = DUTY,
  .hpoint = 0
};

WaveGen::WaveGen(uint8_t analog_switch_pin, uint8_t dac_pin, SPIClass &spi, int8_t sck, int8_t mosi, int8_t ss) {
  _dac = new AD9833(spi, sck, mosi, ss);
  _analog_switch_pin = analog_switch_pin;
  _dac_pin = dac_pin;
  pinMode(_analog_switch_pin, OUTPUT);
  pinMode(_dac_pin, OUTPUT);
  pinMode(15, OUTPUT);

  // start default output for waveform generator: 1kHz sine wave
  sine(1000);
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

void WaveGen::square(int freq, float duty) {
  timer_conf.freq_hz = constrain(freq, MIN_FREQ, MAX_FREQ);
  channel_conf.duty = 256 * duty;

  esp_err_t result;


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

  digitalWrite(_analog_switch_pin, HIGH);
}
