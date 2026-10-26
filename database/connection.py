import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
import pandas as pd
import logging
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Centralized database connection manager for FaultEye"""
    
    def __init__(self):
        self.connected = False
        try:
            self.engine = create_engine(settings.DATABASE_URL)
            self.ensure_schema()
            self._test_connection()
        except Exception as e:
            self.engine = None
            logger.warning(f"⚠️ Database initialization failed (running without DB): {e}")
    
    def ensure_schema(self):
        """Create required tables if they do not exist."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id SERIAL PRIMARY KEY,
                    time TIMESTAMP NOT NULL,
                    sensor_id TEXT,
                    sensor_type TEXT NOT NULL,
                    value DOUBLE PRECISION,
                    unit TEXT,
                    location TEXT,
                    device_id TEXT,
                    metadata JSONB DEFAULT '{}'::jsonb
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor_forecast (
                    id SERIAL PRIMARY KEY,
                    forecast_date TIMESTAMP NOT NULL,
                    sensor_type TEXT NOT NULL,
                    predicted_value DOUBLE PRECISION,
                    lower_bound DOUBLE PRECISION,
                    upper_bound DOUBLE PRECISION,
                    risk_level TEXT,
                    confidence DOUBLE PRECISION,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_readings_time ON sensor_readings (time)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_type ON sensor_readings (sensor_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_forecast_date ON sensor_forecast (forecast_date)")
            conn.commit()
            cursor.close()
            conn.close()
            logger.info("✅ PostgreSQL schema ready")
            return True
        except Exception as e:
            logger.error(f"❌ Schema creation failed: {e}")
            return False
    
    def _test_connection(self):
        """Test database connectivity on initialization"""
        try:
            conn = self.get_connection()
            conn.close()
            logger.info("✅ Database connection established")
            self.connected = True
        except Exception as e:
            logger.warning(f"⚠️ Database connection failed (will retry on demand): {e}")
            self.connected = False
    
    def get_connection(self):
        """Get a new database connection"""
        return psycopg2.connect(settings.DATABASE_URL, cursor_factory=RealDictCursor)
    
    def insert_sensor_data(self, sensor_data):
        """Insert sensor reading into database"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO sensor_readings (time, sensor_id, sensor_type, value, unit, location, device_id)
                VALUES (NOW(), %s, %s, %s, %s, %s, %s)
            """, (
                sensor_data.get('sensor_id'),
                sensor_data.get('sensor_type'),
                sensor_data.get('value'),
                sensor_data.get('unit', ''),
                sensor_data.get('location', 'unknown'),
                sensor_data.get('device_id')
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.debug(f"Inserted: {sensor_data.get('sensor_id')} = {sensor_data.get('value')}")
            return True
            
        except Exception as e:
            logger.error(f"Error inserting sensor data: {e}")
            return False
    
    def get_latest_readings(self, hours=24, sensor_type=None, limit=1000):
        """Get recent sensor readings"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            where_clause = ""
            params = [hours]
            
            if sensor_type:
                where_clause = "AND sensor_type = %s"
                params.append(sensor_type)
            
            cursor.execute(f"""
                SELECT * FROM sensor_readings 
                WHERE time >= NOW() - INTERVAL '%s hours'
                {where_clause}
                ORDER BY time DESC
                LIMIT %s
            """, params + [limit])
            
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"Error fetching readings: {e}")
            return []
    
    def get_sensor_features(self, hours=24):
        """Get aggregated sensor features for ML"""
        try:
            df = pd.read_sql(f"""
                SELECT * FROM sensor_features 
                WHERE time_window >= NOW() - INTERVAL '{hours} hours'
                ORDER BY time_window DESC
            """, self.engine)
            
            return df.to_dict('records')
            
        except Exception as e:
            logger.error(f"Error fetching features: {e}")
            return []
    
    def insert_fault_prediction(self, prediction_data):
        """Insert ML fault prediction"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO fault_predictions 
                (time, sensor_id, sensor_type, fault_probability, fault_type, 
                 recommended_action, severity, model_version, confidence_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                prediction_data.get('time'),
                prediction_data.get('sensor_id'),
                prediction_data.get('sensor_type'),
                prediction_data.get('fault_probability'),
                prediction_data.get('fault_type'),
                prediction_data.get('recommended_action'),
                prediction_data.get('severity'),
                prediction_data.get('model_version'),
                prediction_data.get('confidence_score', 0.0)
            ))
            
            fault_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Inserted fault prediction: {prediction_data.get('fault_type')} (ID: {fault_id})")
            return fault_id
            
        except Exception as e:
            logger.error(f"Error inserting fault prediction: {e}")
            return None
    
    def get_active_faults(self):
        """Get currently unresolved faults"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM fault_predictions 
                WHERE is_resolved = FALSE 
                AND time >= NOW() - INTERVAL '24 hours'
                ORDER BY fault_probability DESC, time DESC
            """)
            
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"Error getting active faults: {e}")
            return []

    def fetch_recent_sensor_history(self, hours=72, sensor_types=None):
        """Return recent sensor history from PostgreSQL for forecasting."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            sensor_clause = ""
            params = []
            if sensor_types:
                sensor_clause = "AND sensor_type IN %s"
                params.append(tuple(sensor_types))

            cursor.execute(
                f"""
                SELECT time, sensor_type, value
                FROM sensor_readings
                WHERE time >= NOW() - INTERVAL '{hours} hours'
                {sensor_clause}
                ORDER BY time ASC
                """,
                params,
            )
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching recent sensor history: {e}")
            return []

    def insert_forecast_record(self, forecast_date, sensor_type, predicted_value, lower_bound, upper_bound, risk_level, confidence):
        """Insert one forecast row into PostgreSQL."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO sensor_forecast
                (forecast_date, sensor_type, predicted_value, lower_bound, upper_bound, risk_level, confidence)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (forecast_date, sensor_type, predicted_value, lower_bound, upper_bound, risk_level, confidence),
            )
            conn.commit()
            cursor.close()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error inserting forecast record: {e}")
            return False

    def get_forecast_rows(self, limit=50):
        """Fetch stored forecast rows."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM sensor_forecast
                ORDER BY forecast_date ASC, sensor_type ASC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching forecast rows: {e}")
            return []

# Global database instance
db = DatabaseManager()