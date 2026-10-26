# FaultEye - Mosquitto MQTT Broker Setup Guide

## Install Mosquitto on Windows

### Step 1: Install via Chocolatey (Recommended)
```powershell
# Run as Administrator
choco install mosquitto
```

### Step 2: OR Download Manually
1. Go to: https://mosquitto.org/download/
2. Download Windows installer (64-bit)
3. Run installer with default settings

### Step 3: Configure Mosquitto
Create config file: `C:\Program Files\mosquitto\mosquitto.conf`

```conf
# Mosquitto Configuration for FaultEye
listener 1883
allow_anonymous true
persistence true
persistence_location C:/Program Files/mosquitto/data/

# Logging
log_dest file C:/Program Files/mosquitto/mosquitto.log
log_type all
```

### Step 4: Start Mosquitto Service
```powershell
# Start service
net start mosquitto

# Set to auto-start on boot
sc config mosquitto start= auto

# Check status
sc query mosquitto
```

### Step 5: Test MQTT Broker
```powershell
# Open 2 terminals

# Terminal 1 - Subscribe
mosquitto_sub -h localhost -t "test/topic"

# Terminal 2 - Publish
mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT!"
```

### Step 6: Verify in Backend
```python
import paho.mqtt.client as mqtt

client = mqtt.Client()
client.connect("localhost", 1883, 60)
print("✅ Connected to local MQTT broker!")
client.disconnect()
```

## Troubleshooting

### Firewall Blocking?
```powershell
# Allow Mosquitto through Windows Firewall
netsh advfirewall firewall add rule name="Mosquitto MQTT" dir=in action=allow protocol=TCP localport=1883
```

### Service won't start?
```powershell
# Check logs
Get-Content "C:\Program Files\mosquitto\mosquitto.log" -Tail 20

# Restart service
net stop mosquitto
net start mosquitto
```

## Expected Output
```
✅ Mosquitto running on localhost:1883
✅ Topic: esp32/sensor_data
✅ Auto-starts on Windows boot
```
