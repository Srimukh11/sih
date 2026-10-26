"""
MQTT Traffic Monitor - Diagnostic Tool
Shows ALL MQTT messages on ALL topics to help debug connection
"""
import paho.mqtt.client as mqtt
import json
from datetime import datetime

MQTT_BROKER = "172.16.59.55"
MQTT_PORT = 1883

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Connected to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        # Subscribe to ALL topics
        client.subscribe("#")  # # = wildcard for all topics
        print("📡 Subscribed to ALL topics (#)")
        print("=" * 80)
        print("Waiting for messages... (Press Ctrl+C to stop)")
        print("=" * 80)
    else:
        print(f"❌ Connection failed with code {rc}")
        print("   Make sure Mosquitto broker is running on 192.168.29.86:1883")

def on_message(client, userdata, msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"\n[{timestamp}] 📨 TOPIC: {msg.topic}")
    print(f"           SIZE: {len(msg.payload)} bytes")
    
    try:
        payload = json.loads(msg.payload.decode())
        print(f"           DATA: {json.dumps(payload, indent=2)}")
    except:
        print(f"           RAW: {msg.payload[:200]}...")  # First 200 chars

# Create MQTT client
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

try:
    print(f"🔄 Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()
except KeyboardInterrupt:
    print("\n\n🛑 Monitoring stopped by user")
    client.disconnect()
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\n💡 TROUBLESHOOTING:")
    print(f"   1. Is Mosquitto running on {MQTT_BROKER}?")
    print(f"   2. Can you ping {MQTT_BROKER}?")
    print(f"   3. Is firewall blocking port {MQTT_PORT}?")
    print(f"   4. Check ESP32 RX serial output for MQTT errors")
