import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
import sys
import logging
from dotenv import load_dotenv

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import settings

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_database():
    """Setup the FaultEye schema with optional TimescaleDB acceleration."""
    
    try:
        # Connect to database
        conn = psycopg2.connect(settings.DATABASE_URL)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        logger.info("🔌 Connected to FaultEye database")
        
        # TimescaleDB is optional. Standard PostgreSQL uses date_bin instead.
        timescale_available = False
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
            timescale_available = True
            logger.info("✅ TimescaleDB extension enabled")
        except psycopg2.errors.FeatureNotSupported:
            logger.warning("⚠️ TimescaleDB is not installed; using standard PostgreSQL tables")
        
        # Create sensor readings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                time TIMESTAMPTZ NOT NULL,
                sensor_id VARCHAR(50) NOT NULL,
                sensor_type VARCHAR(20) NOT NULL,
                value DOUBLE PRECISION NOT NULL,
                unit VARCHAR(10),
                location VARCHAR(100),
                device_id VARCHAR(50),
                metadata JSONB
            );
        """)
        logger.info("✅ Created sensor_readings table")
        
        # Convert to a hypertable only when TimescaleDB is available.
        if timescale_available:
            try:
                cursor.execute("SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);")
                logger.info("✅ Created hypertable for sensor_readings")
            except psycopg2.Error as e:
                if "already exists" in str(e):
                    logger.info("ℹ️ Hypertable already exists")
                else:
                    raise e
        else:
            logger.info("ℹ️ Using regular PostgreSQL table for sensor_readings")
        
        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id_time 
            ON sensor_readings (sensor_id, time DESC);
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_type_time 
            ON sensor_readings (sensor_type, time DESC);
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time 
            ON sensor_readings (device_id, time DESC);
        """)
        logger.info("✅ Created performance indexes")
        
        # Create fault predictions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fault_predictions (
                id SERIAL PRIMARY KEY,
                time TIMESTAMPTZ NOT NULL,
                sensor_id VARCHAR(50),
                sensor_type VARCHAR(20),
                fault_probability DOUBLE PRECISION,
                fault_type VARCHAR(50),
                recommended_action TEXT,
                severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
                model_version VARCHAR(20),
                confidence_score DOUBLE PRECISION,
                is_resolved BOOLEAN DEFAULT FALSE,
                resolved_at TIMESTAMPTZ,
                resolved_by VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        logger.info("✅ Created fault_predictions table")
        
        # Create alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                fault_prediction_id INTEGER REFERENCES fault_predictions(id),
                alert_type VARCHAR(30) CHECK (alert_type IN ('email', 'sms', 'webhook', 'emergency')),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
                recipient VARCHAR(100),
                message TEXT,
                sent_at TIMESTAMPTZ,
                retry_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        logger.info("✅ Created alerts table")
        
        # Create system health table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_health (
                id SERIAL PRIMARY KEY,
                time TIMESTAMPTZ NOT NULL,
                overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
                active_sensors INTEGER,
                active_faults INTEGER,
                critical_faults INTEGER,
                system_status VARCHAR(20) CHECK (system_status IN ('healthy', 'warning', 'critical', 'offline')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        logger.info("✅ Created system_health table")
        
        # Create ML feature engineering view with a standard PostgreSQL fallback.
        time_bucket_expression = (
            "time_bucket('5 minutes', time)"
            if timescale_available
            else "date_bin('5 minutes', time, TIMESTAMPTZ '2000-01-01')"
        )
        cursor.execute(f"""
            CREATE OR REPLACE VIEW sensor_features AS
            SELECT 
                {time_bucket_expression} AS time_window,
                sensor_id,
                sensor_type,
                location,
                device_id,
                COUNT(*) as reading_count,
                AVG(value) as avg_value,
                MAX(value) as max_value,
                MIN(value) as min_value,
                STDDEV(value) as std_value,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value,
                PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY value) as p05_value
            FROM sensor_readings
            GROUP BY time_window, sensor_id, sensor_type, location, device_id;
        """)
        logger.info("✅ Created sensor_features view")
        
        # Create real-time dashboard view
        cursor.execute("""
            CREATE OR REPLACE VIEW dashboard_summary AS
            SELECT 
                sensor_type,
                COUNT(DISTINCT sensor_id) as sensor_count,
                AVG(value) as avg_value,
                MAX(value) as max_value,
                MIN(value) as min_value,
                MAX(time) as last_reading
            FROM sensor_readings
            WHERE time >= NOW() - INTERVAL '1 hour'
            GROUP BY sensor_type;
        """)
        logger.info("✅ Created dashboard_summary view")
        
        # Retention policies are also TimescaleDB-only.
        if timescale_available:
            try:
                cursor.execute(f"""
                    SELECT add_retention_policy('sensor_readings', INTERVAL '{settings.RAW_DATA_RETENTION_DAYS} days');
                """)
                logger.info(f"✅ Set retention policy: {settings.RAW_DATA_RETENTION_DAYS} days")
            except psycopg2.Error as e:
                if "already exists" in str(e):
                    logger.info("ℹ️ Retention policy already exists")
                else:
                    logger.warning(f"Could not set retention policy: {e}")
        else:
            logger.info("ℹ️ Skipping TimescaleDB retention policy")
        
        if timescale_available:
            cursor.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';")
            result = cursor.fetchone()
            logger.info(f"✅ TimescaleDB version: {result[1]}")
        else:
            logger.info("✅ Standard PostgreSQL mode is ready")
        
        cursor.close()
        conn.close()
        
        logger.info("🎉 Database setup completed successfully!")
        logger.info("📊 FaultEye database is ready for ML-powered fault detection!")
        
    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
        raise

def test_connection():
    """Test database connection and basic functionality"""
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        cursor = conn.cursor()
        
        # Test basic connection
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        logger.info(f"✅ PostgreSQL: {version}")
        
        # Test tables
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('sensor_readings', 'fault_predictions', 'alerts', 'system_health')
        """)
        tables = cursor.fetchall()
        logger.info(f"✅ Tables available: {[table[0] for table in tables]}")
        
        # Test hypertables only when TimescaleDB is installed.
        try:
            cursor.execute("SELECT hypertable_name FROM timescaledb_information.hypertables;")
            hypertables = cursor.fetchall()
            logger.info(f"✅ Hypertables: {[ht[0] for ht in hypertables]}")
        except psycopg2.errors.UndefinedTable:
            logger.info("ℹ️ No TimescaleDB hypertables; standard PostgreSQL mode is active")
        
        cursor.close()
        conn.close()
        
        logger.info("🔍 Connection test successful!")
        
    except Exception as e:
        logger.error(f"❌ Connection test failed: {e}")

if __name__ == "__main__":
    print("🚀 Setting up FaultEye TimescaleDB...")
    setup_database()
    test_connection()
    print("\n🎯 Next steps:")
    print("1. Update your .env file with database settings")
    print("2. Update your backend/api_server.py with new database integration")
    print("3. Run: python backend/api_server.py")