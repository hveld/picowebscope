#include "driver/ledc.h"

#define CHANNEL LEDC_CHANNEL_0
#define SPEED_MODE LEDC_LOW_SPEED_MODE
#define DUTY (1)

ledc_timer_config_t timer_conf = {
  .speed_mode = SPEED_MODE,
  .duty_resolution = LEDC_TIMER_1_BIT,
  .timer_num = LEDC_TIMER_0,
  .freq_hz = 4000000,
  .clk_cfg = LEDC_USE_APB_CLK
};

ledc_channel_config_t channel_conf = {
  .gpio_num = 15,
  .speed_mode = SPEED_MODE,
  .channel = CHANNEL,
  .intr_type = LEDC_INTR_DISABLE,
  .timer_sel = LEDC_TIMER_0,
  .duty = DUTY,
  .hpoint = 0
};


void setup() {
  Serial.begin(115200);
  int result;
  pinMode(15, OUTPUT);
  // while(1) {
  //   digitalWrite(15, HIGH);
  //   delay(1);
  //   digitalWrite(15, LOW);
  //   delay(1);
  // }
  
  result = ledc_timer_config(&timer_conf);
  Serial.print("ledc_timer_config(..) = ");
  if(result == ESP_OK) {
    Serial.println("ESP_OK");
  } else {
    if(result == ESP_ERR_INVALID_ARG) {
      Serial.println("ESP_ERR_INVALID_ARG");
    } else if(result == ESP_FAIL ) {
      Serial.println("ESP_FAIL ");
    } else {
      Serial.println("Unhandled return value");
    }
    while(1) {}
  }
  
  result = ledc_channel_config(&channel_conf);
  Serial.print("ledc_channel_config(..) = ");
  if(result == ESP_OK) {
    Serial.println("ESP_OK");
  } else {
    if(result == ESP_ERR_INVALID_ARG) {
      Serial.println("ESP_ERR_INVALID_ARG");
    } else {
      Serial.println("Unhandled return value");
    }
    while(1) {}
  }
  
  result = ledc_set_duty(SPEED_MODE, CHANNEL, DUTY);
  Serial.print("ledc_set_duty(..) = ");
  if(result == ESP_OK) {
    Serial.println("ESP_OK");
  } else {
    if(result == ESP_ERR_INVALID_ARG) {
      Serial.println("ESP_ERR_INVALID_ARG");
    } else {
      Serial.println("Unhandled return value");
    }
    while(1) {}
  }
  
  result = ledc_update_duty(SPEED_MODE, CHANNEL);
  Serial.print("ledc_update_duty(..) = ");
  if(result == ESP_OK) {
    Serial.println("ESP_OK");
  } else {
    if(result == ESP_ERR_INVALID_ARG) {
      Serial.println("ESP_ERR_INVALID_ARG");
    } else {
      Serial.println("Unhandled return value");
    }
    while(1) {}
  }
}

void loop() {}



/*#define LED 15
hw_timer_t *My_timer = NULL;
void IRAM_ATTR onTimer(){
digitalWrite(LED, !digitalRead(LED));
}
void setup() {
pinMode(LED, OUTPUT);
My_timer = timerBegin(0, 80, true);
timerAttachInterrupt(My_timer, &onTimer, true);
timerAlarmWrite(My_timer, 1000000, true);
timerAlarmEnable(My_timer); //Just Enable
}
void loop() {
}*/