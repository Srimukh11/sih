// ============================================================
// ✅ ESP32 RECEIVER (LoRa -> MQTT) - FINAL STABLE VERSION
// ============================================================

#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>

// ------------------- WiFi -------------------
const char* ssid     = "Pavitra_chutiya";
const char* password = "00110011";

// ✅ Disable WiFi sleep (fixes MQTT rc=-2)
void fixWiFi() {
  WiFi.setSleep(false);
}

// ------------------- MQTT -------------------
const char* mqtt_server = "10.75.92.140"; // Laptop IP on the current Wi-Fi network
const int   mqtt_port   = 1883;
const char* mqtt_topic  = "esp32/sensor_data";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ------------------- LoRa -------------------
#define LORA_SS    5
#define LORA_RST   14
#define LORA_DIO0  26
#define LORA_BAND  865E6

// ------------------ Time (IST) ---------------
const char* ntpServer         = "pool.ntp.org";
const long  gmtOffset_sec     = 19800;  // IST
const int   daylightOffset_sec = 0;

unsigned long msg_count = 0;

// ============================================================
// ✅ WiFi Setup (Safe + Robust)
// ============================================================
void setupWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  fixWiFi();   // ✅ Prevents WiFi sleep disconnects

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  } else {
    Serial.println("❌ WiFi FAILED. Will retry...");
  }
}

// ============================================================
// ✅ MQTT Reconnect (Safe)
// ============================================================
void reconnectMQTT() {
  if (mqttClient.connected()) return;

  Serial.print("Connecting MQTT...");
  while (!mqttClient.connected()) {
    if (mqttClient.connect("ESP32_LoRa_Receiver")) {
      Serial.println("✅ connected!");
      mqttClient.subscribe(mqtt_topic);
    } else {
      Serial.print("❌ failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" (retry in 2s)");
      delay(2000);
    }
  }
}

// ============================================================
// ✅ Timestamp
// ============================================================
String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
    return "1970-01-01T00:00:00";

  char buf[24];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buf);
}

// ============================================================
// ✅ JSON Structure Validation
// ============================================================
bool looksLikeJson(const String& s) {
  if (s.length() < 2) return false;

  int i = 0;
  while (i < s.length() && isspace(s[i])) i++;

  int j = s.length() - 1;
  while (j >= 0 && isspace(s[j])) j--;

  if (i >= j) return false;

  return (s[i] == '{' && s[j] == '}');
}

// ============================================================
// ✅ MQTT Publish RAW (Option A)
// ============================================================
void publishPayload(const String& rawJson, long rssi, float snr, int latency_ms) {
  msg_count++;
  
  // Wrap sensor data with LoRa metadata envelope
  String timestamp = getTimestamp();
  String envelope = "{";
  envelope += "\"device_id\":\"esp32_rx_01\",";
  envelope += "\"timestamp\":\"" + timestamp + "\",";
  envelope += "\"lora\":{";
  envelope += "\"rssi\":" + String(rssi) + ",";
  envelope += "\"snr\":" + String(snr, 2) + ",";
  if (latency_ms >= 0) {
    envelope += "\"latency_ms\":" + String(latency_ms) + ",";
  }
  envelope += "\"frequency\":865000000";
  envelope += "},";
  envelope += "\"data\":" + rawJson;
  envelope += "}";
  
  // Publish with QoS 1 and check result
  bool published = mqttClient.publish(mqtt_topic, envelope.c_str(), false);  // QoS 0, not retained
  if (published) {
    Serial.println("✅ MQTT Published => " + String(envelope.length()) + " bytes");
  } else {
    Serial.println("❌ MQTT Publish FAILED!");
    Serial.println("📤 Payload: " + envelope);
  }
}

// ============================================================
// ✅ Setup
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  setupWiFi();
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setBufferSize(512);  // Increase buffer size for large JSON payloads

  // LoRa Setup
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("❌ LoRa init failed!");
    while (1);
  }

  LoRa.setSpreadingFactor(12);  // ✅ SF12 for maximum reliability and uniform latency (must match TX)
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0xF3);       // ✅ Private network sync word (must match TX)
  LoRa.enableCrc();

  Serial.println("✅ LoRa RX Ready.");
}

// ============================================================
// ✅ Loop (Stable LoRa + MQTT)
// ============================================================
void loop() {
  // Only reconnect if disconnected (don't spam WiFi/MQTT on every loop)
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected, reconnecting...");
    setupWiFi();
  }
  
  if (!mqttClient.connected()) {
    Serial.println("⚠️ MQTT disconnected, reconnecting...");
    reconnectMQTT();
  }
  
  mqttClient.loop();  // Process MQTT messages

  int packetSize = LoRa.parsePacket();
  if (!packetSize) return;

  // Read LoRa packet
  unsigned long rx_timestamp = millis();
  
  String raw = "";
  while (LoRa.available()) {
    raw += (char)LoRa.read();
  }

  long rssi = LoRa.packetRssi();
  float snr = LoRa.packetSnr();
  
  // Calculate latency if tx_time is present
  int latency_ms = -1;
  int tx_time_idx = raw.indexOf("\"tx_time\":");
  if (tx_time_idx != -1) {
    int tx_time_start = raw.indexOf(":", tx_time_idx) + 1;
    int tx_time_end = raw.indexOf(",", tx_time_start);
    String tx_time_str = raw.substring(tx_time_start, tx_time_end);
    unsigned long tx_time = tx_time_str.toInt();
    latency_ms = rx_timestamp - tx_time;
  }

  Serial.print("📡 LoRa RX (RSSI=");
  Serial.print(rssi);
  Serial.print(", SNR=");
  Serial.print(snr);
  if (latency_ms >= 0) {
    Serial.print(", LATENCY=");
    Serial.print(latency_ms);
    Serial.print("ms");
  }
  Serial.print(") => ");
  Serial.println(raw);

  // Validate JSON & Publish
  if (looksLikeJson(raw)) {
    publishPayload(raw, rssi, snr, latency_ms);
  } else {
    Serial.println("🚫 Dropped: Invalid JSON");
  }

  delay(5);
}
