# 🔧 FaultEye - Real Hardware Setup Guide

## 🎯 Goal: Get Actual ESP32 Sensor Data Flowing to Dashboard

---

## ⚡ Current System Status

✅ **Backend API Server** - Running on port 8000  
✅ **React Dashboard** - Running on port 3000  
✅ **MQTT Broker (Mosquitto)** - Running on port 1883  
✅ **PostgreSQL Database** - Connected  
❌ **ESP32 Transmitter** - Battery dead (needs recharge/power)  
❌ **ESP32 Receiver** - Needs to be powered and configured

---

## 📋 Hardware Requirements Checklist

### ESP32 Transmitter (Sensor Node):
- [ ] ESP32 DevKit board
- [ ] LoRa SX1278 module (868/915 MHz)
- [ ] YF-S201 Water Flow Sensor
- [ ] Water Level Sensor
- [ ] MQ-5 Gas Sensor
- [ ] LDR (Light Dependent Resistor)
- [ ] AC Current Sensor
- [ ] Power supply (USB cable or battery - **NEEDS CHARGING!**)

### ESP32 Receiver (Gateway):
- [ ] Second ESP32 DevKit board
- [ ] LoRa SX1278 module (868/915 MHz)
- [ ] WiFi access (connects to "KHAN" network)
- [ ] Power supply (USB cable)

---

## 🔌 Step-by-Step Hardware Setup

### **Step 1: Charge/Power Your ESP32 Transmitter**

**Option A: USB Power**
```
1. Connect ESP32 Transmitter to your laptop via USB cable
2. Wait for the device to power on (LED should light up)
3. Open Arduino IDE
4. Select correct COM port (Tools → Port)
5. Open Serial Monitor (Ctrl+Shift+M) at 115200 baud
```

**Option B: Battery Power**
```
1. Connect battery to ESP32 VIN and GND
2. Ensure battery is fully charged (check voltage: 3.7V minimum)
3. Power on the ESP32
```

---

### **Step 2: Upload Transmitter Code** (if not already uploaded)

**File:** `D:\FaultEye\Transmitter\Transmitter.ino`

**Arduino IDE Setup:**
```
1. Open Arduino IDE
2. File → Open → Navigate to D:\FaultEye\Transmitter\Transmitter.ino
3. Tools → Board → ESP32 Dev Module
4. Tools → Port → Select your ESP32's COM port (e.g., COM3, COM4)
5. Tools → Upload Speed → 115200
6. Click Upload button (➔)
```

**What to Expect:**
- Upload takes ~30 seconds
- Serial Monitor shows:
  ```
  ✅ LoRa initialized at 865MHz
  📡 Sending sensor data...
  Water: 45%, Flow: 3.2 L/min
  Gas: Normal (DO1=1)
  AC: Detected (0)
  Light: 856 raw, 0.69V
  ```

---

### **Step 3: Power On ESP32 Receiver**

**File:** `D:\FaultEye\Receiver\Receiver.ino`

**Important Configuration Check:**
```cpp
// In Receiver.ino, verify these settings:
const char* ssid     = "KHAN";              // Your WiFi network
const char* password = "628985059";         // Your WiFi password
const char* mqtt_server = "192.168.29.86";  // Your laptop IP
const int   mqtt_port   = 1883;
```

**Verify Your Laptop IP:**
```powershell
ipconfig | findstr IPv4
```
Expected output: `IPv4 Address. . . . . . . . . . . : 192.168.29.86`

**If IP Changed:**
1. Update `mqtt_server` in Receiver.ino
2. Re-upload the code to ESP32 Receiver

**Upload Steps:**
```
1. Connect ESP32 Receiver via USB
2. Arduino IDE → File → Open → D:\FaultEye\Receiver\Receiver.ino
3. Select correct COM port
4. Upload
```

**What to Expect in Serial Monitor:**
```
Connecting to WiFi: KHAN
✅ WiFi connected. IP: 192.168.29.242
Connecting MQTT...✅ connected!
📡 Listening for LoRa packets...
📨 Received packet from Transmitter
✅ Published to MQTT: esp32/sensor_data
```

---

### **Step 4: Verify Data Flow**

Open the MQTT monitor (already running) and you should see:

```json
📨 [01:23:45] Message received:
{
  "mq5_ao1": 45,
  "mq5_ao2": 1987,
  "mq5_do1": 1,
  "mq5_do2": 1,
  "water_level": 1,
  "flow_rate": 3.456,
  "total_litres": 123.45,
  "ac_detected": 0,
  "ldr_raw": 856,
  "ldr_voltage": 0.69
}
```

**If you see this → SUCCESS!** Real data is flowing! 🎉

---

## 🔍 Troubleshooting Real Hardware

### Problem 1: ESP32 Transmitter Not Sending
**Symptoms:**
- No output in Serial Monitor
- LoRa initialization fails

**Solutions:**
```
1. Check LoRa wiring:
   - LORA_SS (pin 5)
   - LORA_RST (pin 14)
   - LORA_DIO0 (pin 26)
   
2. Verify LoRa frequency: 865MHz (India) or 915MHz (USA)
   
3. Check power supply (USB or battery voltage)

4. Re-upload code with verbose output (Tools → Core Debug Level → Verbose)
```

---

### Problem 2: ESP32 Receiver Not Connecting to WiFi
**Symptoms:**
- "WiFi FAILED" in Serial Monitor
- Continuous reconnection attempts

**Solutions:**
```
1. Verify WiFi credentials:
   - SSID: "KHAN"
   - Password: "628985059"
   
2. Check WiFi signal strength (move closer to router)

3. Restart WiFi router

4. Try a different WiFi network (update code with new credentials)
```

---

### Problem 3: MQTT Connection Failed (rc=-2)
**Symptoms:**
- WiFi connected but MQTT fails
- Error code: -2 (connection refused)

**Solutions:**
```
1. Verify laptop IP hasn't changed:
   ipconfig | findstr IPv4
   
2. Check MQTT broker is running:
   netstat -an | findstr :1883
   
3. Allow firewall access:
   - Windows Firewall → Allow an app
   - Add: mosquitto.exe
   
4. Test MQTT from command line:
   mosquitto_pub -h 192.168.29.86 -t "test" -m "hello"
```

---

### Problem 4: Receiver Gets LoRa Data But Doesn't Publish to MQTT
**Symptoms:**
- Serial Monitor shows "Received packet"
- But no MQTT publish confirmation

**Solutions:**
```
1. Check MQTT connection status in Serial Monitor

2. Verify topic name matches backend subscription:
   - Topic: "esp32/sensor_data"
   
3. Check JSON formatting (must be valid JSON)

4. Increase MQTT keepalive timeout in code
```

---

### Problem 5: Dashboard Shows "Waiting for connection..."
**Symptoms:**
- WebSocket connected (green indicator)
- But no data updates on cards

**Solutions:**
```
1. Verify MQTT messages are arriving:
   - Check monitor_mqtt.py output
   - Should show incoming JSON messages
   
2. Check backend console for processing errors:
   - Look for "✅ Processed message" logs
   
3. Hard refresh dashboard: Ctrl+Shift+F5

4. Check browser console (F12) for WebSocket errors
```

---

## 📊 Verifying Real Data vs Simulated Data

### Real Data Characteristics:
✅ **Consistent sensor readings** (not random jumps)  
✅ **Realistic values** (flow rate doesn't jump from 0 to 7.5 instantly)  
✅ **Timestamp correlation** (matches ESP32 transmission interval)  
✅ **Device ID** shows "tx_esp32_01" (from your Transmitter code)

### Simulated Data Characteristics:
❌ **Random variations** every 5 seconds  
❌ **Artificial fault patterns** (25% chance of faults)  
❌ **Brightness jumps** between 60-100%  
❌ **Device ID** might show "simulated" or generic ID

---

## 🎯 Quick Start Commands

### Monitor MQTT Traffic:
```powershell
cd D:\FaultEye
python monitor_mqtt.py
```

### Check Backend Status:
```powershell
curl http://localhost:8000/health
```

### View Live Dashboard:
```
Open browser: http://localhost:3000
```

### Check Mosquitto Broker:
```powershell
netstat -an | findstr :1883
```

### View Recent Database Readings:
```powershell
python check_recent_data.py
```

---

## 🔄 Data Flow Diagram (Real Hardware)

```
┌─────────────────────────────────────────────────────────────┐
│  ESP32 TRANSMITTER (with sensors)                           │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐│
│  │ Water  │  │  Gas   │  │  AC    │  │  LDR   │  │ LoRa   ││
│  │ Sensors│  │  MQ-5  │  │ Sensor │  │ Light  │  │ Module ││
│  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘│
│      │           │            │            │            │     │
│      └───────────┴────────────┴────────────┴────────────┘     │
│                            │                                  │
│                       [Arduino Code]                          │
│                            │                                  │
│                    Collects & Formats                         │
│                            │                                  │
│                      Transmits via LoRa                       │
│                        (868 MHz)                              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                     LoRa Radio Signal
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  ESP32 RECEIVER (LoRa Gateway)                               │
│  ┌────────┐           ┌────────┐           ┌────────┐       │
│  │ LoRa   │───────────│Arduino │───────────│  WiFi  │       │
│  │ Module │  Receives │  Code  │  Connects │ Module │       │
│  └────────┘           └────────┘           └────────┘       │
│                            │                                 │
│                      Parses JSON                             │
│                            │                                 │
│                    Publishes to MQTT                         │
│                  (esp32/sensor_data)                         │
└──────────────────────────────┬─────────────────────────────┘
                               │
                          MQTT Publish
                        (WiFi Network)
                               │
┌──────────────────────────────▼─────────────────────────────┐
│  MOSQUITTO MQTT BROKER (localhost:1883)                     │
│  Topic: esp32/sensor_data                                   │
└──────────────────────────────┬─────────────────────────────┘
                               │
                        MQTT Subscribe
                               │
┌──────────────────────────────▼─────────────────────────────┐
│  BACKEND API SERVER (api_server_v4.py)                      │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│  │ MQTT   │  │   ML   │  │   AI   │  │Database│           │
│  │ Client │→ │ Model  │→ │  GPT-4 │→ │ Insert │           │
│  └────────┘  └────────┘  └────────┘  └───┬────┘           │
│                                           │                 │
│                                    WebSocket                │
│                                      Broadcast              │
└──────────────────────────────────────┬───────────────────┘
                                       │
                              WebSocket (JSON)
                                       │
┌──────────────────────────────────────▼───────────────────────┐
│  REACT DASHBOARD (localhost:3000)                            │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │ Water  │  │  Gas   │  │ Power  │  │  Data  │            │
│  │  Card  │  │  Card  │  │  Card  │  │  Cable │            │
│  └────────┘  └────────┘  └────────┘  └────────┘            │
│                                                              │
│  📊 Real-time Charts with Historical Data                   │
│  🤖 ML Fault Detection                                       │
│  💡 AI Recommendations                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Success Checklist

Once everything is working, you should see:

- [  ] ESP32 Transmitter Serial Monitor shows sensor readings every few seconds
- [  ] ESP32 Receiver Serial Monitor shows "Published to MQTT"
- [  ] MQTT monitor (monitor_mqtt.py) displays incoming JSON messages
- [  ] Backend logs show "✅ Processed message #N from tx_esp32_01"
- [  ] Dashboard cards update every few seconds with new values
- [  ] Charts show trending data (not flat lines)
- [  ] ML predictions appear ("NORMAL" or "FAULT")
- [  ] Database accumulates readings (check with check_recent_data.py)

---

## 🆘 Still Having Issues?

### Check System Health:
```powershell
# Backend health
curl http://localhost:8000/health

# Recent database entries
python check_recent_data.py

# MQTT broker connections
netstat -an | findstr :1883

# WebSocket connections
# Should show at least 1 connection from dashboard
```

### Enable Verbose Logging:

**Backend (api_server_v4.py):**
- Already has detailed logging enabled
- Check console output for errors

**ESP32 (Arduino Serial Monitor):**
- Set baud rate to 115200
- Enable "Show timestamp" in Serial Monitor
- Look for error messages or connection failures

---

## 📞 Common ESP32 Serial Monitor Messages

### ✅ GOOD Messages:
```
✅ LoRa initialized
📡 Sending sensor data
✅ WiFi connected
✅ MQTT connected
✅ Published to MQTT
```

### ❌ ERROR Messages:
```
❌ LoRa init failed - Check wiring
❌ WiFi FAILED - Check credentials
❌ MQTT connection failed rc=-2 - Check broker IP
⚠️  No LoRa packets received - Check transmitter power
```

---

**Last Updated:** November 10, 2025  
**Purpose:** Get actual ESP32 hardware sending real sensor data to FaultEye dashboard  
**Priority:** Charge ESP32 battery and verify WiFi/MQTT connectivity
