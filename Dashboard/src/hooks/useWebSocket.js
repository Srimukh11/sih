/**
 * WebSocket Hook for Real-time Sensor Data
 * Connects to FaultEye backend and processes sensor updates
 */
import { useState, useEffect, useRef, useCallback } from "react";

const getBackendHost = () => {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname || "localhost";
};

const getBackendWsUrl = () => {
  const host = getBackendHost();
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${host}:8000/ws/sensordata`;
};

const WS_URL = getBackendWsUrl();

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    try {
      console.log("🔄 Attempting WebSocket connection to:", WS_URL);
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log("✅ WebSocket CONNECTED to FaultEye backend");
        console.log("🔌 WebSocket readyState:", ws.current.readyState);
        setConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log("📨 WebSocket received:", payload.type);
          if (payload.type === "sensor_update") {
            console.log("✅ Raw data from backend:", payload.raw);
            console.log("✅ Computed data from backend:", payload.computed);
            console.log("✅ ML prediction:", payload.ml);

            // Update current data with full payload (includes raw, computed, ml, ai, lora)
            setData(payload);

            // Add full payload to history (keep last 20 for logs page)
            setHistory((prev) => {
              const newHistory = [payload, ...prev];
              return newHistory.slice(0, 20);
            });
          }
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error);
        }
      };

      ws.current.onerror = (error) => {
        console.error("❌ WebSocket ERROR:", error);
        setConnected(false);
      };

      ws.current.onclose = (event) => {
        console.log("🔌 WebSocket CLOSED - Code:", event.code, "Reason:", event.reason);
        setConnected(false);

        // ⚡ OPTIMIZED: Faster reconnect (1s instead of 3s)
        reconnectTimeout.current = setTimeout(() => {
          console.log("🔄 Reconnecting in 1 second...");
          connect();
        }, 1000);
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket:", error);
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  // Add history to data when returning
  const dataWithHistory = data
    ? {
        ...data,
        history: history,
      }
    : null;

  return { connected, data: dataWithHistory };
}

/**
 * Transform backend payload to dashboard format
 */
function transformBackendData(payload) {
  const sensors = payload.raw_data || {};
  const ml = payload.ml_prediction || {};
  const ai = payload.ai_advice || "";

  // Calculate derived values
  const flowLpm = sensors.flow_rate || 0;
  const levelPct = sensors.water_level ? 78 : 0;
  const gasAdc = sensors.mq5_ao1 || 0;
  const gasPpm = estimateGasPpm(gasAdc);
  const acOnline = sensors.ac_detected === 1;
  const lightLux = estimateLux(sensors.ldr_voltage || 0);

  return {
    ts: payload.timestamp || new Date().toISOString(),
    lora: {
      rssi: -85,
      snr: 7.5,
      lastPacketSec: 2,
      packets: payload.message_count || 0,
      lossPct: 0.5,
    },
    pipelines: {
      water: {
        flowLpm: flowLpm,
        totalL: sensors.total_litres || 0,
        levelPct: levelPct,
        status: flowLpm === 0 ? "NO FLOW" : flowLpm < 2 ? "LOW FLOW" : "NORMAL",
      },
      gas: {
        ppm: gasPpm,
        adc: gasAdc,
        thresholdPpm: 300,
        status: gasPpm < 200 ? "SAFE" : gasPpm < 400 ? "WARNING" : "CRITICAL",
      },
      power: {
        online: acOnline,
        uptimePct: 99.9,
        lastDownSec: acOnline ? 0 : 10,
        status: acOnline ? "STABLE" : "DOWN",
      },
      datacable: {
        rssiDbm: -45,
        lossPct: 0.5,
        lastMsgSec: 2,
        status: "STABLE",
      },
    },
    sensors: sensors,
    ml: {
      isAnomaly: ml.is_anomaly || false,
      severity: ml.severity || "low",
      prob: ml.fault_probability || 0,
      score: ml.anomaly_score || 0,
    },
    ai: parseAiAdvice(ai),
    history: {
      t: [],
      waterFlow: [],
      waterLevel: [],
      gasPpm: [],
      lightLux: [],
    },
  };
}

/**
 * Estimate gas ppm from ADC (MQ-5 approximation)
 */
function estimateGasPpm(adc) {
  const Vadc = (adc / 4095) * 3.3;
  const RL = 10000;
  const Rs = (RL * (3.3 - Vadc)) / (Vadc || 0.001);
  const R0 = 15000; // Calibration value (adjust based on your sensor)
  const ratio = Rs / R0;

  // Approximate LPG curve (log-log)
  const m = -0.45; // slope
  const b = 0.65; // intercept
  const ppm = Math.pow(10, (Math.log10(ratio) - b) / m);

  return Math.round(Math.min(Math.max(ppm, 0), 10000));
}

/**
 * Estimate lux from LDR voltage
 */
function estimateLux(voltage) {
  const R_FIXED = 10000;
  const V = voltage || 0.001;
  const RLDR = (R_FIXED * (3.3 - V)) / V;

  // Approximate curve (adjust A, B based on your LDR)
  const A = 500;
  const B = -0.7;
  const lux = A * Math.pow(RLDR, B);

  return Math.round(Math.max(lux, 0));
}

/**
 * Parse AI advice (handle both string and JSON)
 */
function parseAiAdvice(ai) {
  if (!ai) {
    return { summary: "Waiting for AI analysis...", items: [] };
  }

  try {
    const parsed = typeof ai === "string" ? JSON.parse(ai) : ai;
    return {
      summary: parsed.summary || "System monitoring active",
      items: parsed.recommendations || parsed.possible_causes || [],
    };
  } catch {
    return { summary: String(ai), items: [] };
  }
}
