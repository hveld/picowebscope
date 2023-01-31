#include <ArduinoJson.h>
#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include "freertos/semphr.h"
#include "SPIFFS.h"
#include <Arduino_JSON.h>
#include "wavegen.h"
#include <ESP32DMASPISlave.h>
#include "wifi_config.h"
#include "FFT.h" // include the library
#include "FFT_signal.h"
#include "math.h"

const int sample_size = 2000;


ESP32DMASPI::Slave slave;

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
// Create a WebSocket object
bool fftVar = false;
float sampleArrayChanne1[sample_size];
AsyncWebSocket ws("/ws");

const uint8_t ad9833_sclk_pin = 17;
const uint8_t ad9833_sdata_pin = 16;
const uint8_t ad9833_fsync_pin = 4;
const uint8_t switch_waveform_generator = 25;
const uint8_t dac_offset = 26;
static SPIClass hspi(HSPI);
WaveGen *wavegen;
const int potPin2 = 35;
const int potPin = 34;
float potValue = 0;
float potValue2 = 0;
int ArrayForScope[] = {0, 0, 0, 0, 0, 0, 0};
int ArrayForFFT[] = {0, 0, 0, 0, 0, 0};
int ArrayForWaveform[] = {0, 0, 0, 0};
String message = "";
void clearChannel(int channel_number);

uint8_t* spi_slave_tx_buf;
uint8_t* spi_slave_rx_buf;

constexpr uint8_t CORE_TASK_SPI_SLAVE {0};
constexpr uint8_t CORE_TASK_PROCESS_BUFFER {0};

static TaskHandle_t task_handle_wait_spi = 0;
static TaskHandle_t task_handle_process_buffer = 0;

static volatile uint32_t rx_count = 0;
typedef enum
{
RX_TRIG_CHANNEL,
RX_TRIG_LEVEL,
RX_TRIG_EDGE,
RX_DESIMATION_I,
}RX_SETTINGS_INDEX;

void task_wait_spi(void* pvParameters) {//task that waits for spi data and updates the settings on the stm
  while (1) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    spi_slave_tx_buf[RX_TRIG_CHANNEL] = ArrayForScope[5]+1;
    spi_slave_tx_buf[RX_TRIG_LEVEL] = ArrayForScope[2];
    spi_slave_tx_buf[RX_TRIG_EDGE] = ArrayForScope[6];       
    spi_slave_tx_buf[RX_DESIMATION_I] = ArrayForScope[0];

    slave.wait(&spi_slave_rx_buf[rx_count], spi_slave_tx_buf, sample_size);
    xTaskNotifyGive(task_handle_process_buffer);//send notification to next task
  }
}

void task_process_buffer(void* pvParameters) {//task that sends the sampling data to the interface
  DynamicJsonDocument docFFT(20000);
  DynamicJsonDocument docOSS(40000);
  while (1) {
    ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
    //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
    if (ArrayForScope[3] == 1 || ArrayForFFT[0] == 1) {//checks if sampler is on, on the itnerface
      if (fftVar == true) {//if fft window
        JsonArray dataFFT = docFFT.createNestedArray("data");
        String outputFFT;
        // 0 == flattop, 1 == hanning, 2 == uniform
        //deze functionaliteit moet naar de stm32
        if (ArrayForFFT[1] == 0) {
          styleFftData(0);
          Serial.println("flattop");
        }
        else if (ArrayForFFT[1] == 1) {
          styleFftData(1);
          Serial.println("hanning");
        }
        else if (ArrayForFFT[1] == 2) {
          styleFftData(2);
          Serial.println("uniform");
        }
        fft_config_t *real_fft_plan = fft_init(SAMPLE_SIZE, FFT_REAL, FFT_FORWARD, fft_input, fft_output);//fft's the data
        for (int k = 0 ; k < SAMPLE_SIZE ; k++)
          real_fft_plan->input[k] = (float)fft_signal[k];
        fft_execute(real_fft_plan);
        int i = 0;
        for (int k = 1 ; k < real_fft_plan->size / 2 ; k++)
        {
          float mag = sqrt(pow(real_fft_plan->output[2 * k], 2) + pow(real_fft_plan->output[2 * k + 1], 2)) / 1;
          int magint = mag / 10;
          //sprintf(print_buf,"%f Hz : %d", mag, freq);
          dataFFT.add(magint);//adds the data to the json doc
        }
        serializeJson(docFFT, outputFFT);//serializes the json and sends it to the interface
        ws.textAll(outputFFT);
        docFFT.clear();
        outputFFT = "";
        fft_destroy(real_fft_plan);
      }
      else {

        JsonArray dataOSS = docOSS.createNestedArray("data");
        String outputOSS;
        for (int i = 0; i < 2000; i++ ) {//adds data to json document
          uint8_t samplesTest =  spi_slave_rx_buf[i];
          dataOSS.add(samplesTest);
        }
        serializeJson(docOSS, outputOSS);
        ws.textAll(outputOSS);//sends ossilioscope data to the interface
        docOSS.clear();
        outputOSS = "";
      }
      //$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
      vTaskDelay(300 / portTICK_PERIOD_MS);
    }
    slave.pop();

    xTaskNotifyGive(task_handle_wait_spi);
  }
}
// Initialize SPIFFS
void initFS() {
  Serial.println("In fs");
  Serial.print(xPortGetCoreID());
  Serial.print("n/");
  if (!SPIFFS.begin()) {
    Serial.println("An error has occurred while mounting SPIFFS");
  }
  else {
    Serial.println("SPIFFS mounted successfully");
  }
}
//websocket initializer
void initWebSocket() {
  ws.onEvent(onEvent);
  server.addHandler(&ws);
}
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {//checks if message is the last fragment
    data[len] = 0; // Null terminate the string
    message = (char*)data; // Convert to string
    JSONVar ObjectJson = JSON.parse(message); // Parse the JSON string

    if (ObjectJson.hasOwnProperty("Ossilloscope")) {//update ossilloscope settings
      ArrayForFFT[0] = 0;
      fftVar = false;
      Serial.println("Oscilloscope");
      ArrayForScope[0] = ObjectJson["TimePerDiv"];
      ArrayForScope[1] = ObjectJson["VoltagePerDiv"];
      ArrayForScope[2] = ObjectJson["Trigger"];
      ArrayForScope[3] = ObjectJson["OnOff"];
      ArrayForScope[4] = ObjectJson["ACDC"];
      ArrayForScope[5] = ObjectJson["Channel"];
      ArrayForScope[6] = ObjectJson["edge"];
      Serial.print("TimePerDiv: ");
      Serial.println(ArrayForScope[0]);
      Serial.print("VoltagePerDiv: ");
      Serial.println(ArrayForScope[1]);
      Serial.print("Trigger: ");
      Serial.println(ArrayForScope[2]);
      Serial.print("OnOff: ");
      Serial.println(ArrayForScope[3]);
      Serial.print("ACDC: ");
      Serial.println(ArrayForScope[4]);
      Serial.print("Channel: ");
      Serial.println(ArrayForScope[5]);
      Serial.print("FallingRising: ");
      Serial.println(ArrayForScope[6]);
      setVoltPerDivisionMux();
      setCoupling();
    }
    if (ObjectJson.hasOwnProperty("FFT")) { //update fft settings
      ArrayForScope[3] = 0;
      fftVar = true;
      Serial.println("FFT");
      ArrayForFFT[0] = ObjectJson["OnOff"];
      ArrayForFFT[1] = ObjectJson["Windowstyle"];
      ArrayForFFT[2] = ObjectJson["centreFrequency"];
      ArrayForFFT[4] = ObjectJson["channelForFFT"];
      ArrayForFFT[5] = ObjectJson["VoltPerDivDb"];
      Serial.print("OnOff: ");
      Serial.println(ArrayForFFT[0]);
      Serial.print("Windowstyle: ");
      Serial.println(ArrayForFFT[1]);// 0 == flattop, 1 == hanning, 2 == uniform
      Serial.print("FftFrequency: ");
      Serial.println(ArrayForFFT[2]);
      Serial.print("ChannelForFFT: ");
      Serial.println(ArrayForFFT[4]);
      Serial.print("VoltPerDivDb: ");
      Serial.println(ArrayForFFT[5]);
    }

    ArrayForWaveform[0] = ObjectJson["frequency"];//update waveform generator settings
    ArrayForWaveform[1] = ObjectJson["dutyCycle"];
    ArrayForWaveform[2] = ObjectJson["golfType"];
    ArrayForWaveform[3] = ObjectJson["offset"];
    Serial.print("Frequency: ");
    Serial.println(ArrayForWaveform[0]);
    Serial.print("DutyCycle: ");
    Serial.println(ArrayForWaveform[1]);
    Serial.print("GolfType: ");
    Serial.println(ArrayForWaveform[2]);
    Serial.print("offset: ");
    Serial.println(ArrayForWaveform[3]);
    switch (ArrayForWaveform[2]) {
      case 0: // sine
        wavegen->sine(ArrayForWaveform[0]);
        break;
      case 1: // square
        wavegen->square(ArrayForWaveform[0], (float)ArrayForWaveform[1] / 100);
        break;
      case 2: // triangle
        wavegen->triangle(ArrayForWaveform[0]);
        break;
    }
    wavegen->setOffset((float)ArrayForWaveform[3] / 100);
  }
}

void setVoltPerDivisionMux() {
  uint8_t select_lines[6][6] = { // [ch1S2, ch1S1, ch1S0, ch2S2, ch2S1, ch2S0]
    {0, 1, 0, 1, 0, 1}, // 10 mV/div   ch1: A2; ch2: A5
    {0, 0, 1, 1, 1, 1}, // 100 mV/div  ch1: A1; ch2: A7
    {1, 0, 0, 0, 1, 0}, // 500 mV/div  ch1: A4; ch2: A2
    {1, 1, 0, 0, 0, 1}, // 1 V/div    ch1: A6; ch2: A1
    {1, 1, 1, 0, 0, 0}, // 2 V/div   ch1: A7; ch2: A0
    {1, 0, 1, 0, 1, 1} // 5 V/div   ch1: A5; ch2: A3
  };
  uint8_t to_output[6];
  switch (ArrayForScope[1]) { // mV per division
    case 10:      memcpy(to_output, select_lines[0], 6);    break;
    case 100:     memcpy(to_output, select_lines[1], 6);    break;
    case 500:     memcpy(to_output, select_lines[2], 6);    break;
    case 1000:    memcpy(to_output, select_lines[3], 6);    break;
    case 2000:    memcpy(to_output, select_lines[4], 6);    break;
    case 5000:    memcpy(to_output, select_lines[5], 6);    break;
    default: return;
  }
  // !! TX pin is normally connected to ch1S2.
  uint8_t pin[6] = {2, 21, 22, 32, 33, 27}; // [ch1S2, ch1S1, ch1S0, ch2S2, ch2S1, ch2S0]
  for (int i = 0; i < 6; i++)
    digitalWrite(pin[i], to_output[i]);
}

void setCoupling() {
  if (ArrayForScope[4] == 1) { // DC coupling
    digitalWrite(0, HIGH);
    //digitalWrite(2, HIGH); // temporarily used for CH1SSEL2
  } else { // AC coupling
    digitalWrite(0, LOW);
    //digitalWrite(2, LOW); // temporarily used for CH1SSEL2
  }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("WebSocket client #%u disconnected\n", client->id());
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}
void styleFftData(int style) {
  switch (style) {
    case 0:// // 0 == flattop, 1 == hanning, 2 == uniform
      Serial.println("Style 0 flattop");
      for (int i = 0; i < sample_size; i++) {
        fft_signal[i] = fft_signal[i] * (0.21557895 - 0.41663158 * cos(2 * PI * i / (1024 - 1)) + 0.277263158 * cos(4 * PI * i / (1024 - 1)) - 0.083578947 * cos(6 * PI * i / (1024 - 1)) + 0.006947368 * cos(8 * PI * i / (1024 - 1)));
      }
      break;
    case 1:
      Serial.println("Style 1 hanning");
      for (int i = 0; i < sample_size; i++) {
        fft_signal[i] = fft_signal[i] * (0.5 - 0.5 * cos(2 * PI * i / (1024)));
      }
      break;
    case 2:
      Serial.println("Style 2 uniform");
      break;
  }
}
// void task2(void *parameter)
// {
//   while (1) {

//     if (ArrayForScope[3] == 1 || ArrayForFFT[0] == 1) {
//       xSemaphoreTake(xMutex, portMAX_DELAY);
//       //if (true) {
//       for (int i = 0; i < sample_size; i++) {
//         //this generates and stacks values like the old one without clearing aslo values to large
//         float sine = 50 + 20 * sin(2 * M_PI * 200 * i / 1000);
//         float sine2 = 50 + 20 * sin(2 * M_PI * 10 * i / 1000);
//         // Serial.println(sine);
//         sampleArrayChanne1[i] = sine;
//         sampleArrayChanne1[i + 1] = sine2;
//         if (ArrayForFFT[4] == 1) {
//           //fft_signal[i] = sine;
//           //Serial.println(fft_signal[i]);
//         }
//         else {
//           //fft_signal[i] = sine2;
//         }
//       }
//       //clearArray();
//     }
//     else {
//     }
//     xSemaphoreGive(xMutex);
//     vTaskDelay(20 / portTICK_PERIOD_MS);
//   }
// }
void clearChannel(int channel_number) {
  if (channel_number == 1) {
    for (int x = 0; x < sample_size; x++)
    {
      sampleArrayChanne1[x] = 0;
    }
  }
  else {
    for (int x = 0; x < sample_size; x++)
    {
      // sampleArrayChannel2[x] = 0;
    }
  }
}

void setup() {
  Serial.begin(115200);
  initFS();//spiffs filesystem
  Serial.print("Setting AP (Access Point)…");
  // Setting up the access point
  // Remove the password parameter, if you want the AP (Access Point) to be open
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);
  //initlizer 
  initWebSocket();
  // Web Server Root URL
  server.on("/", HTTP_GET, [](AsyncWebServerRequest * request) {
    request->send(SPIFFS, "/index.html", "text/html");
  });
  Serial.println("");
  server.serveStatic("/", SPIFFS, "/");
  // Start server
  server.begin();

  spi_slave_tx_buf = slave.allocDMABuffer(sample_size * 2);
  spi_slave_rx_buf = slave.allocDMABuffer(sample_size * 2);


  delay(5000);

  // slave device configuration
  slave.setDataMode(SPI_MODE1);
  slave.setMaxTransferSize(sample_size);

  // begin() after setting
  slave.begin(VSPI);

  xTaskCreatePinnedToCore(task_wait_spi, "task_wait_spi", 2048, NULL, 2, &task_handle_wait_spi, 1);//task for spi data
  xTaskNotifyGive(task_handle_wait_spi);

  xTaskCreatePinnedToCore(//task to send data to interface
    task_process_buffer,
    "task_process_buffer",
    2048,
    NULL,
    2,
    &task_handle_process_buffer,
    1
  );
  wavegen = new WaveGen(switch_waveform_generator, dac_offset, hspi, ad9833_sclk_pin, ad9833_sdata_pin, ad9833_fsync_pin);
  Serial.println("setup klaar");

  // set pins for channel 1/2 selectors and coupling
  uint8_t pinsAsOutput[8] = {21, 2, 22, 27, 33, 32, 0};
  for (int i = 0; i < sizeof(pinsAsOutput) / sizeof(pinsAsOutput[0]); i++)
    pinMode(pinsAsOutput[i], OUTPUT);
}
void loop() {
}
