import sys
sys.path.insert(0, '..')

from database.connection import DatabaseManager
from datetime import datetime

# Connect to database
db = DatabaseManager()

# Get latest readings
print("\n" + "="*80)
print("LATEST 20 SENSOR READINGS FROM DATABASE")
print("="*80 + "\n")

readings = db.get_latest_readings(hours=24, limit=20)

if readings:
    print(f"{'Time':<20} {'Sensor ID':<20} {'Type':<15} {'Value':<10} {'Unit':<10} {'Device':<15}")
    print("-"*100)
    
    for r in readings:
        time_str = r['time'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(r['time'], datetime) else str(r['time'])
        print(f"{time_str:<20} {r['sensor_id']:<20} {r['sensor_type']:<15} {r['value']:<10.2f} {r['unit']:<10} {r['device_id']:<15}")
    
    # Count total readings
    all_readings = db.get_latest_readings(hours=720, limit=100000)
    print("\n" + "-"*100)
    print(f"Total readings in last 24 hours: {len(readings)}")
    print(f"Total readings in last 30 days: {len(all_readings)}")
else:
    print("No readings found in database!")
    print("\nPossible reasons:")
    print("1. Backend server not running")
    print("2. ESP32 TX not transmitting")
    print("3. MQTT connection issue")
    print("4. Database connection issue")

print("\n")