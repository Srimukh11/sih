# 🚀 FaultEye - Latency Optimization Guide

## 📊 Current Latency Breakdown

### Total End-to-End Latency: ~3.5-5 seconds

```
ESP32 Transmitter (delay: 1500ms)
    ↓
LoRa Radio Transmission (~100-200ms with SF12)
    ↓
ESP32 Receiver Processing (~50ms)
    ↓
MQTT Publish (~20ms over WiFi)
    ↓
Backend Processing (~100-500ms with ML/AI)
    ↓
WebSocket Broadcast (~10-20ms)
    ↓
Dashboard React Update (~16ms @ 60fps)
```

---

## ⚡ Optimization Strategy

### Level 1: Quick Wins (No Code Changes) ✅
### Level 2: ESP32 Optimization (Moderate Changes) 🔧
### Level 3: Backend Optimization (Code Changes) 💻
### Level 4: Aggressive Mode (Trade-offs) ⚠️

---

## 🎯 Level 1: Quick Wins (Immediate)

### 1. Reduce ESP32 Transmitter Delay
**Current:** `delay(1500)` = 1.5 seconds between readings
**Optimized:** `delay(500)` = 0.5 seconds

**Impact:** Reduces latency by 1 second (33% improvement!)

**File:** `Transmitter/Transmitter.ino` (Line 136)
```cpp
// BEFORE:
delay(1500);   // ✅ Slow for stable LoRa

// AFTER:
delay(500);    // ⚡ Faster updates, still stable
```

---

### 2. Optimize LoRa Spreading Factor
**Current:** SF12 (most reliable, slowest)
**Optimized:** SF7-9 (faster, still reliable at -123 dBm RSSI)

**Impact:** Reduces LoRa transmission time from ~200ms to ~50ms

**File:** `Transmitter/Transmitter.ino` & `Receiver/Receiver.ino`
```cpp
// BEFORE:
LoRa.setSpreadingFactor(12);   // Slow but VERY stable

// AFTER:
LoRa.setSpreadingFactor(9);    // ⚡ Good balance speed/reliability
```

**LoRa Speed Comparison:**
- SF12: ~200ms, max range, -137 dBm sensitivity
- SF10: ~100ms, good range, -132 dBm sensitivity
- SF9:  ~50ms,  medium range, -129 dBm sensitivity ✅ **Recommended**
- SF7:  ~25ms,  short range, -123 dBm sensitivity

---

### 3. Disable AI Recommendations (Optional)
**Current:** OpenAI API call adds 500-2000ms latency (when anomaly detected)
**Optimized:** Skip AI, use ML only

**Impact:** Reduces processing time by 500-2000ms during faults

**File:** `backend/api_server_v4.py`
```python
# BEFORE:
if ml_result.get('is_anomaly', False):
    ai_advice = get_ai_recommendations(sensor_data, ml_result)

# AFTER (Fast Mode):
ai_advice = ""  # Skip AI for faster response
```

---

## 🔧 Level 2: ESP32 Optimization

### 4. Reduce Backend Processing Delay
**Current:** Queue processor sleeps for 100ms between checks
**Optimized:** Sleep for 10ms (10x faster)

**File:** `backend/api_server_v4.py` (Line 741)
```python
# BEFORE:
await asyncio.sleep(0.1)  # 100ms

# AFTER:
await asyncio.sleep(0.01)  # ⚡ 10ms
```

---

### 5. Optimize WebSocket Heartbeat
**Current:** 30-second timeout for heartbeat
**Optimized:** 5-second heartbeat (faster fault detection)

**File:** `backend/api_server_v4.py` (Line 713)
```python
# BEFORE:
data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)

# AFTER:
data = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
```

---

### 6. Frontend: Reduce Reconnect Delay
**Current:** 3-second wait before reconnecting
**Optimized:** 1-second reconnect

**File:** `Dashboard/src/hooks/useWebSocket.js`
```javascript
// BEFORE:
reconnectTimeout.current = setTimeout(() => {
  console.log("🔄 Reconnecting in 3 seconds...");
  connect();
}, 3000);

// AFTER:
reconnectTimeout.current = setTimeout(() => {
  console.log("🔄 Reconnecting in 1 second...");
  connect();
}, 1000);
```

---

## 💻 Level 3: Backend Optimization

### 7. Cache ML Model Predictions
**Concept:** Skip ML for identical sensor readings
**Impact:** Saves 50-100ms on duplicate data

```python
# Add caching for ML predictions
last_sensor_hash = None
last_ml_result = None

def get_ml_prediction_cached(sensor_data):
    global last_sensor_hash, last_ml_result
    current_hash = hash(str(sensor_data))
    
    if current_hash == last_sensor_hash:
        return last_ml_result
    
    last_sensor_hash = current_hash
    last_ml_result = predictor.predict_fault(sensor_data)
    return last_ml_result
```

---

### 8. Parallel Processing
**Concept:** Process ML and database insert in parallel
**Impact:** Saves 50-100ms

```python
# Run ML and DB insert concurrently
import asyncio

async def process_sensor_data(data):
    # Run these in parallel
    ml_task = asyncio.create_task(run_ml_async(data))
    db_task = asyncio.create_task(insert_db_async(data))
    
    ml_result, db_result = await asyncio.gather(ml_task, db_task)
```

---

## ⚠️ Level 4: Aggressive Optimizations (Trade-offs)

### 9. Skip Database Writes (Dangerous!)
**Impact:** Saves 20-50ms, but loses historical data
**Not Recommended for Production**

### 10. Ultra-Fast LoRa (SF7)
**Impact:** 25ms transmission, but range drops to ~500m
**Use only if Transmitter & Receiver are close**

### 11. Remove CRC Check
**Impact:** Saves 10ms, but risk of corrupted data
**Not Recommended**

---

## 🎯 Recommended Configuration (Best Balance)

### Target: ~1-2 second latency (60-70% improvement!)

**ESP32 Changes:**
```cpp
// Transmitter.ino
delay(500);                      // Line 136
LoRa.setSpreadingFactor(9);     // Line 67

// Receiver.ino  
LoRa.setSpreadingFactor(9);     // Match transmitter
```

**Backend Changes:**
```python
# api_server_v4.py
await asyncio.sleep(0.01)        # Line 741 (10ms instead of 100ms)
timeout=5.0                       # Line 713 (5s instead of 30s)

# Disable AI for speed (optional)
ai_advice = ""  # Skip OpenAI calls
```

**Frontend Changes:**
```javascript
// useWebSocket.js
}, 1000);  // 1-second reconnect instead of 3
```

---

## 📈 Expected Results After Optimization

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| ESP32 Delay | 1500ms | 500ms | -1000ms |
| LoRa TX (SF12→SF9) | 200ms | 50ms | -150ms |
| Backend Queue | 100ms | 10ms | -90ms |
| AI Processing | 500ms+ | 0ms | -500ms |
| **Total Latency** | **~3.5s** | **~1.2s** | **65% faster!** |

---

## 🛠️ Implementation Steps

### Step 1: Update ESP32 Transmitter
```bash
1. Open Arduino IDE
2. File → Open → Transmitter/Transmitter.ino
3. Change line 67: setSpreadingFactor(9)
4. Change line 136: delay(500)
5. Upload to ESP32 Transmitter
```

### Step 2: Update ESP32 Receiver
```bash
1. Open Arduino IDE
2. File → Open → Receiver/Receiver.ino
3. Change line 67: setSpreadingFactor(9)
4. Upload to ESP32 Receiver
5. Monitor Serial - verify RSSI still good (>-130 dBm)
```

### Step 3: Update Backend
```bash
1. Stop backend (Ctrl+C in terminal)
2. Edit api_server_v4.py (changes below)
3. Restart: python backend/api_server_v4.py
```

### Step 4: Update Dashboard
```bash
1. Edit Dashboard/src/hooks/useWebSocket.js
2. Dashboard will hot-reload automatically
3. Or refresh browser: Ctrl+Shift+R
```

---

## 🔍 Testing Latency

### Measure End-to-End Latency:

**Method 1: Serial Monitor Timestamps**
```
ESP32 TX: 00:58:42.123
Backend:  00:58:43.456
Latency = 1.333 seconds
```

**Method 2: Add Latency Logging**
```python
# In api_server_v4.py, add:
rx_time = datetime.now()
# ... processing ...
latency = (datetime.now() - rx_time).total_seconds()
logger.info(f"⏱️ Latency: {latency*1000:.0f}ms")
```

**Method 3: Browser Console**
```javascript
// Dashboard will show timestamps
console.log("Data age:", Date.now() - new Date(payload.timestamp))
```

---

## 📊 Latency Comparison Table

| Configuration | Latency | Range | Reliability | Use Case |
|---------------|---------|-------|-------------|----------|
| **Current (SF12, 1.5s delay)** | 3.5s | 2km | 99.9% | Max range |
| **Recommended (SF9, 0.5s delay)** | 1.2s | 800m | 98% | ✅ Best balance |
| **Fast (SF7, 0.5s delay)** | 0.8s | 400m | 90% | Indoor only |
| **Ultra-Fast (SF7, no AI, 0.2s)** | 0.5s | 400m | 85% | ⚠️ Racing mode |

---

## ⚠️ Important Notes

### When Using Lower Spreading Factors:

1. **Monitor RSSI:** Should stay above -125 dBm
   - If RSSI drops below -130 dBm → Increase SF
   - Current RSSI: -123 to -124 dBm ✅ Good for SF9

2. **Check Packet Loss:**
   - Count missed packets in receiver
   - If >2% loss → Increase SF or reduce distance

3. **Test in Final Location:**
   - SF9 works well at current distance
   - May need SF10-11 if moving Transmitter further

### LoRa Settings Compatibility:
⚠️ **Both Transmitter AND Receiver must use SAME settings:**
- Same Spreading Factor
- Same Bandwidth (125kHz)
- Same Coding Rate (4/5)

---

## 🎯 Quick Command Reference

### Check Current Latency:
```python
python check_recent_data.py  # Shows timestamps
```

### Monitor MQTT Performance:
```python
python monitor_mqtt.py  # Real-time message viewing
```

### Test WebSocket Speed:
```javascript
// In browser console (F12)
performance.now()  // Before and after data arrives
```

---

## 🚀 Ready to Optimize?

I can help you implement these changes! Which level do you want to start with?

**Recommended Order:**
1. ✅ Level 1: ESP32 delay + LoRa SF (biggest impact)
2. 💻 Level 3: Backend optimization  
3. 🎨 Level 2: Frontend polish

Would you like me to make these changes now?
