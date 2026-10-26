import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database Configuration
    DATABASE_URL = os.getenv(
        "DATABASE_URL", 
        "postgresql://faulteye_user:faulteye_secure_2024@localhost:5432/faulteye"
    )
    
    # MQTT Configuration (for ESP32)
    MQTT_BROKER = os.getenv("MQTT_BROKER", "10.75.92.140")
    MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "faulteye")
    
    # ML Configuration
    ANOMALY_THRESHOLD = float(os.getenv("ANOMALY_THRESHOLD", "0.7"))
    MODEL_UPDATE_INTERVAL = int(os.getenv("MODEL_UPDATE_INTERVAL", "3600"))  # 1 hour
    
    # Alert Configuration
    ENABLE_EMAIL = os.getenv("ENABLE_EMAIL", "true").lower() == "true"
    ENABLE_SMS = os.getenv("ENABLE_SMS", "false").lower() == "true"
    ALERT_EMAIL = os.getenv("ALERT_EMAIL", "alerts@yourcompany.com")
    EMERGENCY_PHONE = os.getenv("EMERGENCY_PHONE", "+1234567890")
    
    # API Configuration
    API_HOST = os.getenv("API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("API_PORT", "8000"))
    
    # Data Retention
    RAW_DATA_RETENTION_DAYS = int(os.getenv("RAW_DATA_RETENTION_DAYS", "90"))
    AGGREGATED_DATA_RETENTION_DAYS = int(os.getenv("AGGREGATED_DATA_RETENTION_DAYS", "365"))
    
    # ═══════════════════════════════════════════════════════════
    # SENSOR THRESHOLDS & PIPELINE CONFIGURATION
    # ═══════════════════════════════════════════════════════════
    
    # Pipeline Definitions
    PIPELINES = {
        'water': {
            'id': 'water',
            'name': 'Water Line',
            'sensors': ['flow_rate', 'water_level', 'total_litres']
        },
        'gas': {
            'id': 'gas',
            'name': 'Gas Line',
            'sensors': ['mq5_ao1', 'mq5_ao2', 'mq5_do1', 'mq5_do2']
        },
        'power': {
            'id': 'power',
            'name': 'Electricity Line',
            'sensors': ['ac_detected']
        },
        'fiber': {
            'id': 'fiber',
            'name': 'Data Cable (Fiber)',
            'sensors': ['ldr_raw', 'ldr_voltage']
        }
    }
    
    # Sensor Thresholds (configurable per deployment)
    SENSOR_THRESHOLDS = {
        # Water Line Sensors
        'flow_rate': {
            'min': float(os.getenv("THRESHOLD_FLOW_MIN", "1.0")),
            'max': float(os.getenv("THRESHOLD_FLOW_MAX", "4.0")),
            'normal': float(os.getenv("THRESHOLD_FLOW_NORMAL", "2.5")),
            'unit': 'L/min',
            'node_name': 'Flow Sensor 1'
        },
        'water_level': {
            'min': int(os.getenv("THRESHOLD_WATER_LEVEL_MIN", "1")),
            'max': int(os.getenv("THRESHOLD_WATER_LEVEL_MAX", "1")),
            'normal': int(os.getenv("THRESHOLD_WATER_LEVEL_NORMAL", "1")),
            'unit': 'boolean',
            'node_name': 'Water Level Sensor'
        },
        'total_litres': {
            'min': float(os.getenv("THRESHOLD_TOTAL_LITRES_MIN", "0")),
            'max': float(os.getenv("THRESHOLD_TOTAL_LITRES_MAX", "10000")),
            'normal': None,
            'unit': 'L',
            'node_name': 'Flow Meter Total'
        },
        
        # Gas Line Sensors
        'mq5_ao1': {
            'min': float(os.getenv("THRESHOLD_GAS_AO1_MIN", "0")),
            'max': float(os.getenv("THRESHOLD_GAS_AO1_MAX", "400")),
            'normal': float(os.getenv("THRESHOLD_GAS_AO1_NORMAL", "200")),
            'unit': 'ADC',
            'node_name': 'Gas Sensor 1 (MQ5-AO1)',
            'critical_threshold': float(os.getenv("THRESHOLD_GAS_AO1_CRITICAL", "3200"))
        },
        'mq5_ao2': {
            'min': float(os.getenv("THRESHOLD_GAS_AO2_MIN", "0")),
            'max': float(os.getenv("THRESHOLD_GAS_AO2_MAX", "400")),
            'normal': float(os.getenv("THRESHOLD_GAS_AO2_NORMAL", "200")),
            'unit': 'ADC',
            'node_name': 'Gas Sensor 2 (MQ5-AO2)',
            'critical_threshold': float(os.getenv("THRESHOLD_GAS_AO2_CRITICAL", "3500"))
        },
        'mq5_do1': {
            'min': int(os.getenv("THRESHOLD_GAS_DO1_MIN", "1")),
            'max': int(os.getenv("THRESHOLD_GAS_DO1_MAX", "1")),
            'normal': int(os.getenv("THRESHOLD_GAS_DO1_NORMAL", "1")),
            'unit': 'boolean',
            'node_name': 'Gas Sensor 1 Digital'
        },
        'mq5_do2': {
            'min': int(os.getenv("THRESHOLD_GAS_DO2_MIN", "1")),
            'max': int(os.getenv("THRESHOLD_GAS_DO2_MAX", "1")),
            'normal': int(os.getenv("THRESHOLD_GAS_DO2_NORMAL", "1")),
            'unit': 'boolean',
            'node_name': 'Gas Sensor 2 Digital'
        },
        
        # Power Line Sensors
        'ac_detected': {
            'min': int(os.getenv("THRESHOLD_AC_MIN", "0")),
            'max': int(os.getenv("THRESHOLD_AC_MAX", "0")),
            'normal': int(os.getenv("THRESHOLD_AC_NORMAL", "0")),
            'unit': 'boolean',
            'node_name': 'AC Power Sensor'
        },
        
        # Fiber/Data Cable Sensors
        'ldr_raw': {
            'min': float(os.getenv("THRESHOLD_LDR_RAW_MIN", "300")),
            'max': float(os.getenv("THRESHOLD_LDR_RAW_MAX", "4095")),
            'normal': float(os.getenv("THRESHOLD_LDR_RAW_NORMAL", "2000")),
            'unit': 'ADC',
            'node_name': 'Fiber Optic Sensor (LDR)'
        },
        'ldr_voltage': {
            'min': float(os.getenv("THRESHOLD_LDR_VOLTAGE_MIN", "0.5")),
            'max': float(os.getenv("THRESHOLD_LDR_VOLTAGE_MAX", "3.3")),
            'normal': float(os.getenv("THRESHOLD_LDR_VOLTAGE_NORMAL", "1.6")),
            'unit': 'V',
            'node_name': 'Fiber Optic Voltage'
        }
    }
    
    # Severity Calculation Rules
    SEVERITY_RULES = {
        'critical_sensors': ['mq5_do1', 'mq5_do2', 'water_level'],  # Boolean sensors that trigger critical
        'high_deviation_threshold': float(os.getenv("HIGH_DEVIATION_THRESHOLD", "50.0")),  # % deviation
        'medium_deviation_threshold': float(os.getenv("MEDIUM_DEVIATION_THRESHOLD", "20.0"))  # % deviation
    }
    
    # AI Configuration
    AI_MAX_ACTIONS = int(os.getenv("AI_MAX_ACTIONS", "5"))
    AI_MAX_WORDS_PER_ACTION = int(os.getenv("AI_MAX_WORDS_PER_ACTION", "12"))
    AI_MAX_SUMMARY_WORDS = int(os.getenv("AI_MAX_SUMMARY_WORDS", "15"))

settings = Settings()