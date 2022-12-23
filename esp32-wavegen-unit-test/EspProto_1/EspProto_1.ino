/*#include <ArduinoJson.h>
#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include "freertos/semphr.h"
#include "SPIFFS.h"
#include <Arduino_JSON.h>
#include "Test.h"*/
#include "wavegen.h"
/*#include "wifi_config.h"


TaskHandle_t Task1;
TaskHandle_t Task2;
SemaphoreHandle_t xMutex = NULL;
Test test;
// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
// Create a WebSocket object
bool fftVar = false;
float sampleArray[1024];
AsyncWebSocket ws("/ws");*/

const uint8_t ad9833_sclk_pin = 17;
const uint8_t ad9833_sdata_pin = 16;
const uint8_t ad9833_fsync_pin = 4;
const uint8_t switch_waveform_generator = 25;
const uint8_t dac_offset = 26;
static SPIClass hspi(HSPI);
WaveGen *wavegen;
/*
const int potPin = 34;
float potValue = 0;
int ArrayForScope[] = {0, 0, 0, 0, 0, 0, 0};
int ArrayForFFT[] = {0, 0, 0, 0, 0};
int ArrayForWaveform[] = {0, 0, 0};
String message = "";

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
void initWebSocket() {
  ws.onEvent(onEvent);
  server.addHandler(&ws);
}
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  //Serial.print("Websocket handle");
  //Serial.print(xPortGetCoreID());
  //Serial.print("/n");
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0; // Null terminate the string
    message = (char*)data; // Convert to string
    JSONVar ObjectJson = JSON.parse(message); // Parse the JSON string
    if (ObjectJson.hasOwnProperty("Ossilloscope")) {
      ArrayForFFT[0] = 0;
      fftVar = false;
      Serial.println("oss");
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
      Serial.print("fallingRising: ");
      Serial.println(ArrayForScope[6]);
    }
    if (ObjectJson.hasOwnProperty("FFT")) {
      ArrayForScope[3] = 0;
      fftVar = true;
      Serial.println("fft");
      ArrayForFFT[0] = ObjectJson["OnOff"];
      ArrayForFFT[1] = ObjectJson["Windowstyle"];
      ArrayForFFT[2] = ObjectJson["centreFrequency"];
      ArrayForFFT[3] = ObjectJson["bandwith"];
      ArrayForFFT[4] = ObjectJson["scanRate"];
      Serial.print("onOff: ");
      Serial.println(ArrayForFFT[0]);
      Serial.print("Windowstyle: ");
      Serial.println(ArrayForFFT[1]);
      Serial.print("centreFrequency: ");
      Serial.println(ArrayForFFT[2]);
      Serial.print("bandwith: ");
      Serial.println(ArrayForFFT[3]);
      Serial.print("scanRate: ");
      Serial.println(ArrayForFFT[4]);
    }

    ArrayForWaveform[0] = ObjectJson["frequency"];
    ArrayForWaveform[1] = ObjectJson["dutyCycle"];
    ArrayForWaveform[2] = ObjectJson["golfType"];
    Serial.print("frequency: ");
    Serial.println(ArrayForWaveform[0]);
    Serial.print("dutyCycle: ");
    Serial.println(ArrayForWaveform[1]);
    Serial.print("golftype: ");
    Serial.println(ArrayForWaveform[2]);
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

  }
}
void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      //Serial.printf("WebSocket client #%u disconnected\n", client->id());
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

//sampling hier moet het sturn nog niet gebeuren buffer 1 vullen
void task1(void *parameter)
{
  delay(5000);
  String output1;
  String fftString;
//  test.dittt();
  while (1)
  {
    xSemaphoreTake(xMutex, portMAX_DELAY);
    if (ArrayForScope[3] == 1 || ArrayForFFT[0] == 1) {
      //if(true){
      if (fftVar == true) {
        Serial.println("TEST1");
        
        DynamicJsonDocument docFFT(65536);
        JsonArray dataFFT = docFFT.createNestedArray("data");
        test.dittt();
        for (int i = 0; i < 1024; i++) {
          dataFFT.add(test.valuesFFT[i]);
        }
        clearArray();
        Serial.println("TEST1");
        Serial.println(test.valuesFFT[1]);
        serializeJson(docFFT, fftString);
        ws.textAll(fftString);
        dataFFT.clear();
        test.clearFFT();
        fftString = "";
        fftVar = true;
      }
      else {
        Serial.println("TEST-2");
        Serial.println(fftVar);
        Serial.println(ESP.getFreeHeap());
        DynamicJsonDocument doc2(65536);
        JsonArray data1 = doc2.createNestedArray("data");
        for (int i = 0; i < 1024; i++) {
          data1.add(sampleArray[i]);
        }
        serializeJson(doc2, output1);
        ws.textAll(output1);
        data1.clear();
        output1 = "";

      }
    }
    else {
    }
    xSemaphoreGive(xMutex);
    vTaskDelay(1 / portTICK_PERIOD_MS);
  }
}
//task2 moet buffer 1 > buffer 2 en dan sturen
void task2(void *parameter)
{
  while (1) {
    //if(ArrayForScope[3] == 1 || ArrayForFFT[0] == 1){
    xSemaphoreTake(xMutex, portMAX_DELAY);
    if (true) { 
      for (int i = 0; i < 1024; i++) {
        int randNumber = random(10, 20);
        sampleArray[i] = randNumber;
      }
    }
    else {
    }
    xSemaphoreGive(xMutex);
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}
void clearArray(){
  for (int x = 0; x <1024; x++)
  {
    sampleArray[x] = 0;
  }
}
void taskRealSamples(void *parameter) {
  while (1) {
    xSemaphoreTake(xMutex, portMAX_DELAY);
    if (true) {
      //if(ArrayForScope[3] == 1 || ArrayForFFT[0] == 1){
      for (int i = 0; i < 1024; i++) {
        potValue = analogRead(potPin);
        sampleArray[i] = potValue;
        test.samples[i] = potValue;
      }
    }
    else {}
    xSemaphoreGive(xMutex);
    vTaskDelay(1/ portTICK_PERIOD_MS);
  }
}*/
int freq;
float duty;
char wave;
void setup() {
  Serial.begin(115200);
  //Serial.begin(1000000);
  /*ledcSetup(0, 5000, 8);
  ledcAttachPin(32, 0);
  ledcWrite(0, 128);
  
  initFS();
  Serial.print(SSE_MAX_QUEUED_MESSAGES);
  Serial.print("Setting AP (Access Point)…");
  // Remove the password parameter, if you want the AP (Access Point) to be open
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);
  initWebSocket();
  // Web Server Root URL
  server.on("/", HTTP_GET, [](AsyncWebServerRequest * request) {
    request->send(SPIFFS, "/index.html", "text/html");
  });
  Serial.println("");
  server.serveStatic("/", SPIFFS, "/");
  // Start server
  server.begin();
  xMutex = xSemaphoreCreateMutex();
  xTaskCreatePinnedToCore(
    task1, // Task function. 
    "Task1",   //* name of task. 
    10000,     //* Stack size of task 
    NULL,      //* parameter of the task
    1,         //* priority of the task 
    &Task1,    //* 1ask handle to keep track of created task 
    1);        //* pin task to core 0 
  xTaskCreatePinnedToCore(
    taskRealSamples, //* Task function. 
    "Task2",   //* name of task. 
    10000,     //* Stack size of task 
    NULL,      //* parameter of the task 
    1,         //* priority of the task 
    &Task2,    //* Task handle to keep track of created task 
    1);        //* pin task to core 0 
    */
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
