import paho.mqtt.client as mqtt
import json
import time

MQTT_BROKER = "172.16.59.55"
MQTT_PORT = 1883
MQTT_TOPIC = "esp32/sensor_data"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Connected to MQTT broker (rc={rc})")
    else:
        print(f"❌ Connection failed (rc={rc})")

def on_publish(client, userdata, mid):
    print(f"✅ Message published (mid={mid})")

# Create client
client = mqtt.Client()
client.on_connect = on_connect
client.on_publish = on_publish

print(f"🔄 Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_start()

time.sleep(2)  # Wait for connection

# Publish test message
test_data = {
    "device_id": "test_publisher",
    "timestamp": "2025-11-12T01:23:00",
    "lora": {"rssi": -120, "snr": -15.0, "frequency": 865000000},
    "data": {
        "tx_time": 1234567,
        "mq5_ao1": 3000,
        "mq5_ao2": 1400,
        "mq5_do1": 0,
        "mq5_do2": 1,
        "water_level": 50,
        "flow_rate": 1.5,
        "total_litres": 100.0,
        "ac_detected": 1,
        "ldr_raw": 500,
        "ldr_voltage": 0.4
    }
}

payload = json.dumps(test_data)
print(f"\n📤 Publishing to topic: {MQTT_TOPIC}")
print(f"📦 Payload: {payload}")

result = client.publish(MQTT_TOPIC, payload, qos=0)
print(f"📊 Publish result: success={result.is_published()}, rc={result.rc}")

time.sleep(2)
client.loop_stop()
client.disconnect()
print("\n✅ Test complete")
