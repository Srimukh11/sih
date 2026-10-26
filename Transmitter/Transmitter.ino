// ===========================================================
// ESP32 TRANSMITTER (LoRa Only - Crash-Safe, Clean, Stable)
// ===========================================================

#include <SPI.h>
#include <LoRa.h>

// --------------------- LoRa ------------------------
#define LORA_SS   5
#define LORA_RST  14
#define LORA_DIO0 26
#define LORA_BAND 865E6

// --------------------- Sensors ----------------------
const int AO_1 = 34;
const int AO_2 = 35;

const int DO_1 = 27;
const int DO_2 = 33;

#define WATER_LEVEL_PIN 25

// ✅ MOVED (GPIO12 → GPIO4)
const int FLOW_SENSOR_PIN = 4;

volatile unsigned long pulseCount = 0;
unsigned long lastFlowTime = 0;
float flowRate = 0.0;
float totalLitres = 0.0;

const float calibrationFactor = 7.5;

#define AC_SENSOR_PIN 13
#define LED_PIN 2

const int LDR_PIN = 32;
const float VREF = 3.3;

// ------------------ Interrupt Handler ----------------
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

// ------------------ Setup ----------------------------
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(DO_1, INPUT);
  pinMode(DO_2, INPUT);
  pinMode(WATER_LEVEL_PIN, INPUT);

  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

  pinMode(AC_SENSOR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LDR_PIN, INPUT);

  // ------------ LoRa Setup ------------
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("LoRa Init Failed!");
    while (1);
  }

  LoRa.setSpreadingFactor(12);  // ✅ SF12 for maximum reliability and uniform latency
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0xF3);       // ✅ Private network sync word (filters noise)
  LoRa.enableCrc();

  Serial.println("LoRa TX Ready.");
}

// ------------------ Main Loop ------------------------
void loop() {

  // ------------ MQ-5 Gas Sensor ------------
  int mq5_ao1 = analogRead(AO_1);
  int mq5_ao2 = analogRead(AO_2);
  int mq5_do1 = digitalRead(DO_1);
  int mq5_do2 = digitalRead(DO_2);

  // ------------ Water Level ------------
  int water_level = digitalRead(WATER_LEVEL_PIN);

  // ------------ Flow Sensor ------------
  unsigned long now = millis();
  if (now - lastFlowTime >= 1000) {

    detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN));

    flowRate = ((1000.0 / (now - lastFlowTime)) * pulseCount) / calibrationFactor;
    totalLitres += (flowRate / 60.0);

    pulseCount = 0;
    lastFlowTime = now;

    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);
  }

  // ------------ AC Detector ------------
  int ac_detected = digitalRead(AC_SENSOR_PIN);
  digitalWrite(LED_PIN, ac_detected ? HIGH : LOW);

  // ------------ LDR ------------
  int ldr_raw = analogRead(LDR_PIN);
  float ldr_voltage = (ldr_raw / 4095.0) * VREF;

  // ------------ JSON Payload ------------
  unsigned long tx_timestamp = millis();
  
  String payload = "{";
  payload += "\"tx_time\":" + String(tx_timestamp) + ",";
  payload += "\"mq5_ao1\":" + String(mq5_ao1) + ",";
  payload += "\"mq5_ao2\":" + String(mq5_ao2) + ",";
  payload += "\"mq5_do1\":" + String(mq5_do1) + ",";
  payload += "\"mq5_do2\":" + String(mq5_do2) + ",";
  payload += "\"water_level\":" + String(water_level) + ",";
  payload += "\"flow_rate\":" + String(flowRate, 3) + ",";
  payload += "\"total_litres\":" + String(totalLitres, 3) + ",";
  payload += "\"ac_detected\":" + String(ac_detected) + ",";
  payload += "\"ldr_raw\":" + String(ldr_raw) + ",";
  payload += "\"ldr_voltage\":" + String(ldr_voltage, 3);
  payload += "}";

  // ------------ LoRa Transmission ------------
  detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN));

  LoRa.beginPacket();
  LoRa.print(payload);
  LoRa.endPacket();

  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

  Serial.println("LoRa TX => " + payload);

  delay(500);  // ✅ Reduced from 1500ms to 500ms for faster updates
}
