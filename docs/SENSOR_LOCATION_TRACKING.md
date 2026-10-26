# 📍 FaultEye Sensor Location Tracking - Setup Guide

## ✅ Backend Implementation Complete!

### What's New:

1. **Distance Estimation** - RSSI-based ranging using Log-Distance Path Loss (LDPL) model
2. **Pipeline Tracking** - 4 utility lines × 8 nodes = 32 monitoring points
3. **Real-time Location Updates** - WebSocket stream at `/api/ws/locations`
4. **System Health Monitoring** - TX/RX/MQTT/Backend status tracking

### API Endpoints Added:

```
GET  /api/pipelines          - Get all 4 pipelines with node locations
GET  /api/health             - Get system health (TX/RX/MQTT/WS status)
POST /api/pipelines/{pid}/node/{node_id}/telemetry  - Update node telemetry
POST /api/health/update      - Update system health from monitors
WS   /api/ws/locations       - Real-time location updates WebSocket
```

### Files Created:

1. `backend/location_models.py` - Pydantic models for Pipeline, Node, Health
2. `backend/distance_calculator.py` - RSSI-to-distance conversion functions
3. `backend/api_server_v4.py` - Updated with location tracking routes

### Test the Backend:

1. **Start the backend** (if not running):
   ```powershell
   cd D:\FaultEye\backend
   python api_server_v4.py
   ```

2. **Test API endpoints**:
   ```powershell
   # Get pipelines
   curl http://localhost:8000/api/pipelines

   # Get health
   curl http://localhost:8000/api/health
   ```

3. **Test WebSocket** (in browser console):
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/api/ws/locations');
   ws.onmessage = (ev) => console.log(JSON.parse(ev.data));
   ws.send('ping');
   ```

### Current Pipeline Setup:

All 4 pipelines initialized with 8 nodes each (0-175m):

- **Water Line** - Water flow + level sensors
- **Gas Line** - MQ-5 gas sensors  
- **Electricity Line** - AC current sensors
- **Data Cable (Fiber)** - LDR light sensors

### Distance Calculation:

**Formula**: `d = d0 * 10^((RSSI_ref - RSSI) / (10*n))`

**Default calibration** (adjust per environment):
- Water: n=2.8, RSSI@1m=-38dBm
- Gas: n=2.7, RSSI@1m=-40dBm
- Power: n=3.0, RSSI@1m=-42dBm
- Data: n=2.9, RSSI@1m=-39dBm

### How Calibration Works:

1. Place test TX at known distances: 2m, 10m, 30m, 60m
2. Record average RSSI at each position (60+ packets)
3. Use `calibrate_path_loss_exponent()` function:
   ```python
   from backend.distance_calculator import calibrate_path_loss_exponent
   
   measurements = [(2, -45), (10, -70), (30, -85), (60, -95)]
   n, rssi_1m = calibrate_path_loss_exponent(measurements)
   print(f"Path loss exponent: {n:.2f}")
   print(f"RSSI at 1m: {rssi_1m:.1f} dBm")
   ```

### Next Steps:

- [ ] Frontend React components (SensorLocations.jsx, PillNav.jsx)
- [ ] Tailwind CSS styling setup
- [ ] Device Info & Logs pages
- [ ] Production calibration with real hardware

### Notes:

- Current implementation uses single TX (node_id=1 for all pipelines)
- RSSI/SNR extracted from LoRa metadata (currently hardcoded -124dBm/0dB)
- To add real RSSI: Extract from ESP32 RX before MQTT publish
- Multi-node support: Parse node_id from sensor payload
