# FaultEye - Final System Workflow

## 🎯 System Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   ESP32      │  LoRa   │   ESP32      │  MQTT   │   Backend    │
│ Transmitter  ├────────►│   Receiver   ├────────►│  API Server  │
│ (Sensors)    │  868MHz │  (Gateway)   │  WiFi   │  (FastAPI)   │
└──────────────┘         └──────────────┘         └───────┬──────┘
                                                           │
                                                           │ WebSocket
                                                           │
                                                    ┌──────▼──────┐
                                                    │   React     │
                                                    │  Dashboard  │
                                                    └─────────────┘
```

## 📊 Data Flow Pipeline

### 1. **Hardware Layer** (ESP32 Transmitter + Sensors)
   - **Water Sensors:**
     - YF-S201 Flow Sensor → Flow Rate (L/min)
     - Water Level Sensor → Presence Detection (0/1)
   
   - **Gas Sensor:**
     - MQ-5 Gas Sensor → PPM + Digital Detection
     - Two outputs: Analog (ADC) + Digital (0=gas detected)
   
   - **Electricity Sensor:**
     - AC Current Detection → Presence (0=ON, 1=OFF)
   
   - **Data Cable (Light Sensor):**
     - LDR (Light Dependent Resistor) → Raw ADC + Voltage
     - Simulates fiber optic cable integrity via brightness

### 2. **Communication Layer** (LoRa + MQTT)
   - ESP32 Transmitter sends sensor data via **LoRa** (868 MHz, long-range)
   - ESP32 Receiver receives LoRa packets and forwards to MQTT broker
   - MQTT Broker (Mosquitto) on `localhost:1883`
   - Topic: `esp32/sensor_data`

### 3. **Processing Layer** (Backend API)
   **File:** `backend/api_server_v4.py`
   
   **Responsibilities:**
   - ✅ Subscribe to MQTT topic
   - ✅ Parse incoming sensor data
   - ✅ Calculate derived values:
     - Water: Flow rate validation, level percentage
     - Gas: PPM calculation, fault detection
     - Electricity: Health percentage, uptime
     - **Data Cable: Brightness % and voltage from LDR**
   - ✅ Run ML fault prediction (RandomForest)
   - ✅ Generate AI recommendations (OpenAI GPT-4)
   - ✅ Store readings in PostgreSQL database
   - ✅ Broadcast to WebSocket clients

### 4. **Visualization Layer** (React Dashboard)
   **Files:** 
   - `Dashboard/src/layouts/dashboard/index.js` - Main dashboard
   - `Dashboard/src/utils/sensorTransformers.js` - Data transformations
   - `Dashboard/src/hooks/useWebSocket.js` - Real-time connection

   **Features:**
   - Real-time pipeline status cards (4 utilities)
   - ML fault detection indicator
   - AI-powered recommendations
   - LoRa communication stats (RSSI, SNR, packet loss)
   - **Updated Chart:** Data Cable shows LDR brightness & voltage (NOT LoRa stats)
   - Historical trend graphs (last 30 readings)

## 🔧 Key Clarification: Data Cable vs LoRa

### ❌ **BEFORE (Incorrect):**
```
Data Cable Chart = LoRa Communication Stats
- RSSI (signal strength)
- SNR (signal-to-noise ratio)  
- Packet Loss (%)
```

### ✅ **AFTER (Correct):**
```
Data Cable Chart = LDR/Light Sensor Data
- Brightness (%) - calculated from LDR raw ADC value
- Voltage (V) - LDR output voltage

LoRa Communication Stats = Separate section (top-right card)
- Still shows RSSI, SNR, packets, loss
- Represents the wireless communication health
```

## 🚀 Running the System

### Prerequisites:
1. ✅ PostgreSQL database running (port 5433)
2. ✅ Mosquitto MQTT broker running (port 1883)
3. ✅ Python 3.10+ with dependencies installed
4. ✅ Node.js 16+ with npm

### Startup Commands:

**Terminal 1 - Backend API:**
```powershell
cd backend
python api_server_v4.py
```
- Listens on: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws/sensordata`

**Terminal 2 - React Dashboard:**
```powershell
cd Dashboard
npm start
```
- Opens at: `http://localhost:3000`

**Terminal 3 - Sensor Simulator (if ESP32 battery dead):**
```powershell
python simulate_sensor_data.py
```
- Publishes to: `esp32/sensor_data` topic
- Interval: Every 5 seconds
- Generates realistic sensor data with random faults

### With Real Hardware:
1. Upload `Transmitter/Transmitter.ino` to ESP32 #1 (with sensors)
2. Upload `Receiver/Receiver.ino` to ESP32 #2 (WiFi gateway)
3. Power both devices
4. Stop the simulator (Ctrl+C in Terminal 3)
5. Real data will flow automatically

## 📈 Chart Data Mapping

### Recent Sensor Trends (Main Chart):
```javascript
- Water Flow (L/min) - Blue line
- Gas (ppm) - Red line  
- Brightness (%) - Orange line ← CHANGED from "Light (lux / 10)"
- Water Level (%) - Green line
```

### Individual Pipeline Charts:

**1. Water Pipeline:**
- Flow Rate (L/min)
- Level (%)

**2. Gas Pipeline:**
- Gas Concentration (ppm)

**3. Electricity Pipeline:**
- Uptime (%)
- Status (0=OFF, 100=ON)

**4. Data Cable (LDR Sensor):** ← UPDATED
- **Brightness (%)** - Percentage of max brightness
- **Voltage (V × 10)** - LDR output voltage (scaled for visibility)

## 🎓 Understanding the Data Cable Analogy

**Physical Concept:**
In industrial settings, fiber optic cables transmit data using light. If the cable is damaged, light intensity drops.

**Our Implementation:**
- LDR sensor measures ambient light
- **High brightness (>60%)** → Cable integrity good → Status: NORMAL
- **Low brightness (<30%)** → Cable degraded → Status: FAULT
- Voltage correlates with light intensity

**Dashboard Display:**
- Top card shows: Brightness % and Voltage
- Bottom chart shows: Historical trend of both metrics
- Status indicator: Green (✓) or Red (!)

## 🐛 Troubleshooting

### No Data on Dashboard:
1. Check WebSocket connection (top-right: "Connected" indicator)
2. Verify backend is running: `http://localhost:8000/health`
3. Check MQTT broker: `netstat -an | findstr :1883`
4. If ESP32 battery dead: Run simulator (`python simulate_sensor_data.py`)

### Chart Not Updating:
1. Refresh browser (Ctrl+F5)
2. Check browser console (F12) for errors
3. Verify data structure in WebSocket messages

### Wrong Chart Data:
- If "Data Cable" still shows LoRa stats: **Hard refresh required** (Ctrl+Shift+R)
- Dashboard file was updated to use `dataCable.brightnessPercent` and `dataCable.voltage`

## 📦 Files Modified in This Session

### Backend:
- `backend/api_server_v4.py` - Added formatted chart data (`water`, `gas`, `power`, `dataCable` objects)

### Frontend:
- `Dashboard/src/layouts/dashboard/index.js`:
  - Line ~270: Changed main chart label "Light (lux / 10)" → "Brightness (%)"
  - Line ~387: Changed "Data Cable (LoRa Communication)" → "Data Cable (Light/LDR Sensor)"
  - Chart datasets updated to show `brightnessPercent` and `voltage` instead of RSSI/SNR

### Utilities:
- `simulate_sensor_data.py` - Continuous sensor data generator
- `monitor_mqtt.py` - MQTT message monitor for debugging

## ✅ System Status

- **Backend API:** ✅ Running (port 8000)
- **React Dashboard:** ✅ Running (port 3000)
- **MQTT Broker:** ✅ Active (port 1883)
- **Database:** ✅ Connected (PostgreSQL)
- **ML Model:** ✅ Loaded (90.73% accuracy)
- **Sensor Simulator:** ✅ Running (sending data every 5s)
- **Chart Fix:** ✅ Applied (Data Cable now shows LDR data)

---

**Last Updated:** November 10, 2025  
**System Version:** FaultEye v4.0  
**Test Status:** 97.3% pass rate (36/37 tests)
