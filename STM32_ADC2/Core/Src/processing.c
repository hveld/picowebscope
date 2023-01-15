#include "processing.h"
#include "main.h"
#include <stdio.h>
#include "settings.h"
#include "processing.h"

#define SPI_TX_BUF_SIZE 			(OUTPUT_AMOUNT * 2)
#define SPI_RX_BUF_SIZE 			(OUTPUT_AMOUNT * 2)

extern ADC_HandleTypeDef hadc1;
extern DMA_HandleTypeDef hdma_adc1;
extern SPI_HandleTypeDef hspi1;

extern SPI_HandleTypeDef hspi1;
extern TIM_HandleTypeDef htim9;

extern volatile uint8_t ADC_DMA_Buf[DMA_BUFFER_SIZE];
extern volatile uint8_t processReadyFlag;

static volatile uint8_t spi_tx_buf[SPI_TX_BUF_SIZE];
static volatile uint8_t spi_rx_buf[SPI_TX_BUF_SIZE];

static volatile uint32_t process_i = 0;
static volatile uint32_t spi_tx_i = 0;

static uint32_t processBuf_endIndex;
static uint32_t triggerIndex;
static volatile uint8_t *processBuf;
static volatile uint8_t triggerActivated = 0;


/* ---------- Settings ---------- */

static volatile uint32_t decimationFactor = 0;
static volatile EdgeType selectedEdge = RISING_EDGE;


const uint32_t DESIMATION_FACTORS[15] =
{
		0,
		2,
		5,
		10,
		20,
		50,
		100,
		200,
		500,
		1000,
		2000,
		5000,
		10000,
		20000,
		50000,
};

GlobalSettings currentSettings =
{
		.triggerChannel = DEFUALT_TRIG_CH,
		.triggerLevel = DEFAULT_TRIG_LVL,
		.triggerEdge = DEFAULT_TRIG_EDGE,
		.decimation_i = DEFUALT_DECIMATION_I,
};


void update_settings()
{
	set_trigger_channel(currentSettings.triggerChannel);
	set_trigger(&hadc1, currentSettings.triggerEdge, currentSettings.triggerLevel);
	decimationFactor = DESIMATION_FACTORS[currentSettings.decimation_i];
}


/* ---------- ADC DMA Ping Pong ---------- */


void HAL_ADC_ConvCpltCallback(ADC_HandleTypeDef* hadc)
{
	processBuf = &ADC_DMA_Buf[DMA_BUFFER_SIZE/2];
	processBuf_endIndex = DMA_BUFFER_SIZE;
	if (triggerActivated)
	{
		processReadyFlag = 1;
	}
}

void HAL_ADC_ConvHalfCpltCallback(ADC_HandleTypeDef* hadc)
{
	processBuf = &ADC_DMA_Buf[0];
	processBuf_endIndex = DMA_BUFFER_SIZE / 2;
	if (triggerActivated)
	{
		processReadyFlag = 1;
	}
}


/* ---------- Decimation functions ---------- */

static void decimate_sample()
{
	static uint32_t decimationCounter = 0;

	uint32_t j = 0;

	if (triggerIndex != NO_TRIGGER_INDEX)
	{
		decimationCounter = decimationFactor;
		process_i = 0;

		if (triggerIndex > (DMA_BUFFER_SIZE / 2))
		{
			j = triggerIndex - (DMA_BUFFER_SIZE / 2);
		}
		else
		{
			j = triggerIndex;
		}

		triggerIndex = NO_TRIGGER_INDEX;
	}

	for (;(j < (DMA_BUFFER_SIZE / 2) - 1) && (process_i < SPI_TX_BUF_SIZE - 1); j += 2)
	{
		if (decimationCounter >= decimationFactor)
		{
			spi_tx_buf[process_i] = processBuf[j];
			spi_tx_buf[process_i + 1] = processBuf[j + 1];
			process_i += 2;

			decimationCounter = 0;
		}
		decimationCounter++;
	}
}

static void decimate_hi_res()
{
	static uint32_t CH1averageSum = 0;
	static uint32_t CH2averageSum = 0;
	static uint32_t decimationCounter = 0;

	uint32_t j = 0;

	if (triggerIndex != NO_TRIGGER_INDEX)
	{
		CH1averageSum = 0;
		CH2averageSum = 0;

		decimationCounter = 0;
		process_i = 0;

		if (triggerIndex > (DMA_BUFFER_SIZE / 2))
		{
			j = triggerIndex - (DMA_BUFFER_SIZE / 2);
		}
		else
		{
			j = triggerIndex;
		}

		triggerIndex = NO_TRIGGER_INDEX;
	}

	for (;(j < (DMA_BUFFER_SIZE / 2) - 1) && (process_i < SPI_TX_BUF_SIZE - 1); j += 2)
	{
		decimationCounter++;

		// Decimation factor 0 is special because we can't divide by 0
		if (decimationFactor == 0)
		{
			spi_tx_buf[process_i] = processBuf[j];
			spi_tx_buf[process_i + 1] = processBuf[j + 1];

			process_i += 2;
		}
		else if (decimationCounter >= decimationFactor)
		{
			spi_tx_buf[process_i] = (CH1averageSum + processBuf[j]) / decimationFactor;
			spi_tx_buf[process_i + 1] = (CH2averageSum + processBuf[j + 1]) / decimationFactor;
			CH1averageSum = 0;
			CH2averageSum = 0;

			process_i += 2;
			decimationCounter = 0;
		}
		else
		{
			CH1averageSum += processBuf[j];
			CH2averageSum += processBuf[j + 1];
		}
	}
}

/* ---------- Processing ---------- */

void process_DMA_buf()
{
	// Processs the new samples till the end of the processBuf has been reached
	decimate_sample();

	// Alternative way of reducing samples
	//decimate_hi_res();

	// Everything in this if statement has been added for testing
	if (process_i >= 2000)
	{
		HAL_GPIO_WritePin(SPI1_SS_GPIO_Port, SPI1_SS_Pin, RESET);
		HAL_SPI_TransmitReceive(&hspi1, spi_tx_buf, spi_rx_buf, SPI_TX_BUF_SIZE, 1000);
		HAL_GPIO_WritePin(SPI1_SS_GPIO_Port, SPI1_SS_Pin, SET);

		if (spi_rx_buf[RX_TRIG_CHANNEL] != 0) // A valid channel will always be greater than 0
		{

			// Make sure that the settings are valid before changing
			if (spi_rx_buf[RX_TRIG_CHANNEL] < 3)
				currentSettings.triggerChannel = spi_rx_buf[RX_TRIG_CHANNEL];

			// Small oversight. If a low trigger level is set no more triggering and thus no opportunity to ever change settings.
			if (spi_rx_buf[RX_TRIG_LEVEL] >= 25 && spi_rx_buf[RX_TRIG_LEVEL] <= 75)
				currentSettings.triggerLevel = spi_rx_buf[RX_TRIG_LEVEL];

			if (spi_rx_buf[RX_TRIG_EDGE] < 2)
				currentSettings.triggerEdge = spi_rx_buf[RX_TRIG_EDGE];

			if (spi_rx_buf[RX_DESIMATION_I] < 16)
				currentSettings.decimation_i = spi_rx_buf[RX_DESIMATION_I];
		}

		// Processing is now done so apply the (new) settings
		update_settings();

		// Slow down the sending of fast samples (for testing)
		HAL_Delay(500);

		process_i = 0;
		triggerActivated = 0;
		__HAL_ADC_CLEAR_FLAG(&hadc1, ADC_FLAG_AWD);
		__HAL_ADC_ENABLE_IT(&hadc1, ADC_IT_AWD);
	}
	processReadyFlag = 0;
}

/* ---------- Scope Trigger ---------- */


void HAL_ADC_LevelOutOfWindowCallback(ADC_HandleTypeDef* hadc)
{
	static EdgeType currentEdge = NO_EDGE;
	int DMA_index = (DMA_BUFFER_SIZE - 1) - hadc->DMA_Handle->Instance->NDTR;

	// There are always 2 active channels
	// Make sure the DMA index value is for the selected trigger channel
	if (((DMA_index % 2) == 0) && ((hadc->Instance->CR1 & 0x1F) == 2))
	{
		// If the NDTR value is for channel 1 but channel 2 is selected
		// Move 1 position to get the correct index
		DMA_index = ((DMA_index - 1) >= 0) ? (DMA_index - 1) : (DMA_index + 1);
	}
	else if (((DMA_index % 2) != 0) && ((hadc->Instance->CR1 & 0x1F) == 1))
	{
		// If the NDTR value is for channel 2 but channel 1 is selected
		// Move 1 position to get the correct index
		DMA_index = ((DMA_index - 1) >= 0) ? (DMA_index - 1) : (DMA_index + 1);
	}

	if (currentEdge == NO_EDGE)
	{
		if (ADC_DMA_Buf[DMA_index] >= hadc->Instance->HTR)
		{
			currentEdge = RISING_EDGE;
		}
		else if (ADC_DMA_Buf[DMA_index] <= hadc->Instance->LTR)
		{
			currentEdge = FALLING_EDGE;
		}
	}
	else
	{
		// Trigger RISING_EDGE
		if (ADC_DMA_Buf[DMA_index] >= hadc->Instance->HTR)
		{
			// If the last edge was a FALLING edge we've now captured the transition from FALLING -> RISING
			if (currentEdge == FALLING_EDGE)
			{
				// Let's get ready for processing
				if (selectedEdge == RISING_EDGE)
				{
					// If channel 2 is selected we get the DMA index of channel 1 (easier to work with)
					if ((hadc->Instance->CR1 & 0x1F) == 2)
					{
						// We don't have to check for negative because channel 2 starts at index 1;
						DMA_index = DMA_index - 1;
					}

					triggerIndex = DMA_index;
					triggerActivated = 1;
					__HAL_ADC_DISABLE_IT(&hadc1, ADC_IT_AWD);
					__HAL_ADC_CLEAR_FLAG(&hadc1, ADC_FLAG_AWD);
					currentEdge = NO_EDGE;
					//HAL_TIM_Base_Start_IT(&htim9);
				}
				// We want the other edge so keep on triggering
				else
				{
					currentEdge = RISING_EDGE;
				}
			}
		}

		// Trigger FALLING_EDGE
		else if (ADC_DMA_Buf[DMA_index] <= hadc->Instance->LTR)
		{
			// If the last edge was a RISING edge we've now captured the transition from RISING -> FALLING
			if (currentEdge == RISING_EDGE)
			{
				// Let's get ready for processing
				if (selectedEdge == FALLING_EDGE)
				{
					// If channel 2 is selected we get the DMA index of channel 1 (easier to work with)
					if ((hadc->Instance->CR1 & 0x1F) == 2)
					{
						// We don't have to check for negative because channel 2 starts at index 1;
						DMA_index = DMA_index - 1;
					}

					triggerIndex = DMA_index;
					triggerActivated = 1;
					__HAL_ADC_DISABLE_IT(&hadc1, ADC_IT_AWD);
					__HAL_ADC_CLEAR_FLAG(&hadc1, ADC_FLAG_AWD);
					currentEdge = NO_EDGE;
					//HAL_TIM_Base_Start_IT(&htim9);
				}
				// We want the other edge so keep on triggering
				else
				{
					currentEdge = FALLING_EDGE;
				}
			}
		}
	}
}


void set_trigger_channel(uint8_t channelNumber)
{
	if (channelNumber == 1 || channelNumber == 2)
	{
		hadc1.Instance->CR1 = (hadc1.Instance->CR1 & 0xFFFFFFE0) | channelNumber;
	}
}


void set_trigger(ADC_HandleTypeDef* hadc, EdgeType edge, uint8_t percentage)
{
	selectedEdge = edge;
	if (edge == RISING_EDGE)
	{
		hadc->Instance->HTR = (int) ((percentage/100.0) * ADC_LIMIT);
		hadc->Instance->LTR = ((hadc->Instance->HTR - 30)  >= 0) ? (hadc->Instance->HTR - 30) : 0;
	}
	else if (edge == FALLING_EDGE)
	{
		hadc->Instance->LTR = (int) ((percentage/100.0) * ADC_LIMIT);
		hadc->Instance->HTR = ((hadc->Instance->LTR + 30)  <= ADC_LIMIT) ? (hadc->Instance->LTR + 30) : ADC_LIMIT;
	}
}


/* ---------- TIMER Interrupt ---------- */

// Currently not in use because the timer is disabled
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
	// Check if the correct timer caused the interrupt
	if (htim == &htim9)
	{
		// "a Host should write lengths that are multiples of 4 bytes. The data with inappropriate lengths will be discarded."
		//https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/spi_slave.html#restrictions-and-known-issues
		int spi_tx_amount = (process_i - spi_tx_i);
		if ((spi_tx_amount % 4) != 0)
		{
			if (spi_tx_amount >= 4)
			{
				spi_tx_amount -= (spi_tx_amount % 4);
			}
			else
			{
				// Not enough data available to send (and still be a multiple of 4)
				spi_tx_amount = 0;
			}
		}

		// If at least 4 bytes are available (with multiples of 4) send those.
		if (spi_tx_amount >= 4)
		{
			HAL_GPIO_WritePin(SPI1_SS_GPIO_Port, SPI1_SS_Pin, RESET);
			HAL_SPI_TransmitReceive_IT(&hspi1, &spi_tx_buf[spi_tx_i], spi_rx_buf, spi_tx_amount);
			// SS is set again in SPI callback

			spi_tx_i += spi_tx_amount;
		}
	}
}

/* ---------- SPI COMMUNICATION ---------- */

// Currently not in use because the blocking functions for SPI are used for testing
void HAL_SPI_TxRxCpltCallback(SPI_HandleTypeDef *hspi)
{
	// Set the SS line high after when transmission complete
	HAL_GPIO_WritePin(SPI1_SS_GPIO_Port, SPI1_SS_Pin, SET);

	// Update the currentSettings if new settings arrived with the last transmission
	if (spi_rx_buf[RX_TRIG_CHANNEL] != 0) // A valid channel will always be greater than 0
	{
		// Make sure that the settings are valid before changing
		if (spi_rx_buf[RX_TRIG_CHANNEL] < 3)
			currentSettings.triggerChannel = spi_rx_buf[RX_TRIG_CHANNEL];

		if (spi_rx_buf[RX_TRIG_LEVEL] < 100)
			currentSettings.triggerLevel = spi_rx_buf[RX_TRIG_LEVEL];

		if (spi_rx_buf[RX_TRIG_EDGE] < 2)
			currentSettings.triggerEdge = spi_rx_buf[RX_TRIG_EDGE];

		if (spi_rx_buf[RX_DESIMATION_I] < 16)
			currentSettings.decimation_i = spi_rx_buf[RX_DESIMATION_I];
	}

	if (spi_tx_i >= SPI_TX_BUF_SIZE)
	{
		// Timer will be enabled on a new trigger activation
		HAL_TIM_Base_Stop_IT(&htim9);

		spi_tx_i = 0;
		process_i = 0;

		// Processing is now done so apply the (new) settings
		update_settings();

		// Reset the trigger
		triggerActivated = 0;
		__HAL_ADC_CLEAR_FLAG(&hadc1, ADC_FLAG_AWD);
		__HAL_ADC_ENABLE_IT(&hadc1, ADC_IT_AWD);
	}
}

