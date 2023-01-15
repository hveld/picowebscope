#ifndef INC_PROCESSING_H_
#define INC_PROCESSING_H_

#include "processing.h"
#include "main.h"
#include <stdio.h>
#include "settings.h"
#include "processing.h"

#define OUTPUT_AMOUNT	1000
#define ADC_LIMIT		255

// 15 possible desimation factors
// These control the Time/DIV
extern const uint32_t DESIMATION_FACTORS[15];

typedef enum
{
	RX_TRIG_CHANNEL,
	RX_TRIG_LEVEL,
	RX_TRIG_EDGE,
	RX_DESIMATION_I,
}RX_SETTINGS_INDEX;

typedef enum
{
	RISING_EDGE = 0,
	FALLING_EDGE = 1,
	NO_EDGE = 2,
}EdgeType;


typedef struct
{
	uint8_t triggerChannel;
	uint8_t triggerLevel;
	EdgeType triggerEdge;
	uint8_t decimation_i;
} GlobalSettings;


void HAL_ADC_ConvCpltCallback(ADC_HandleTypeDef* hadc);
void HAL_ADC_ConvHalfCpltCallback(ADC_HandleTypeDef* hadc);
void HAL_ADC_LevelOutOfWindowCallback(ADC_HandleTypeDef* hadc);

void process_DMA_buf();
void set_trigger(ADC_HandleTypeDef* hadc, EdgeType edge, uint8_t percentage);
void set_trigger_channel(uint8_t channelNumber);
void update_settings();

#endif /* INC_PROCESSING_H_ */
