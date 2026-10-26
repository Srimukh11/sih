/**
 * FaultEye Dashboard - Sensor Data Transformers
 *
 * This module contains all calculation functions to transform raw sensor data
 * into human-readable, intuitive values for display in the dashboard.
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clamp a value between min and max
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// WATER LINE TRANSFORMERS
// ============================================================================

/**
 * Convert water flow sensor data to L/min
 * @param {number} flowRate - Raw flow rate from sensor
 * @returns {number} Flow in liters per minute
 */
export const calculateFlowLPM = (flowRate) => {
  return parseFloat(flowRate || 0);
};

export const normalizeSensorData = (rawData = {}) => ({
  ...rawData,
  flow_rate: rawData.flow_rate ?? rawData.flow_lpm ?? rawData.water_flow ?? 0,
  water_level: rawData.water_level ?? 0,
  mq5_ao1: rawData.mq5_ao1 ?? rawData.gas ?? 0,
  mq5_ao2: rawData.mq5_ao2 ?? 0,
  mq5_do1: rawData.mq5_do1 ?? rawData.gas_digital ?? 1,
  mq5_do2: rawData.mq5_do2 ?? 1,
  ac_detected: rawData.ac_detected ?? rawData.ac_current ?? 1,
  ldr_raw: rawData.ldr_raw ?? rawData.light ?? 0,
  ldr_voltage: rawData.ldr_voltage ?? rawData.light_voltage ?? 0,
  total_litres: rawData.total_litres ?? rawData.water_flow_total ?? 0,
});

/**
 * Convert water level sensor to percentage
 * @param {number} waterLevel - Water level (0 = absent, 1 = present)
 * @returns {number} Water level percentage (0 or 100)
 */
export const calculateWaterLevelPercent = (waterLevel) => {
  return waterLevel === 1 ? 100 : 0;
};

/**
 * Determine water line status
 * @param {number} flowLPM - Flow rate in L/min
 * @param {number} waterLevel - Water level (0 or 1)
 * @returns {object} { status: 'normal'|'warning'|'fault', message: string }
 */
export const getWaterLineStatus = (flowLPM, waterLevel) => {
  if (waterLevel === 0) {
    return { status: "fault", message: "No water detected" };
  }
  if (flowLPM < 2) {
    return { status: "fault", message: "Low flow rate" };
  }
  if (flowLPM > 5) {
    return { status: "warning", message: "High flow - possible overflow" };
  }
  return { status: "normal", message: "Operating normally" };
};

// ============================================================================
// GAS LINE TRANSFORMERS
// ============================================================================

/**
 * Determine if gas is present based on multiple sensors
 * @param {object} gasData - { mq5_do1, mq5_do2, mq5_ao1, mq5_ao2 }
 * @returns {boolean} True if gas detected
 */
export const isGasPresent = (gasData) => {
  const { mq5_do1, mq5_do2, mq5_ao1, mq5_ao2 } = gasData;

  // Digital sensors (active low - 0 means gas detected)
  const gas_present_digital = mq5_do1 === 0 || mq5_do2 === 0;

  // Analog sensors (high ADC value means gas detected)
  const gas_present_analog = mq5_ao1 >= 3200 || mq5_ao2 >= 3500;

  return gas_present_digital || gas_present_analog;
};

/**
 * Get gas line status
 * @param {object} gasData - Gas sensor data
 * @returns {object} { status: 'normal'|'fault', message: string }
 */
export const getGasLineStatus = (gasData) => {
  const gasPresent = isGasPresent(gasData);

  if (gasPresent) {
    return { status: "fault", message: "Gas leak detected!" };
  }
  return { status: "normal", message: "No gas detected" };
};

/**
 * Get primary gas ADC value for display
 * @param {object} gasData - Gas sensor data
 * @returns {number} Primary analog value
 */
export const getGasADCValue = (gasData) => {
  return gasData.mq5_ao1 || 0;
};

/**
 * Calculate estimated gas PPM from ADC value
 * @param {number} gasADC - Gas ADC value (0-4095)
 * @returns {number} Estimated PPM
 */
export const calculateGasPPM = (gasADC) => {
  // Rough approximation: ADC range (0-4095) maps to ~0-1000 PPM
  return Math.round((gasADC / 4095) * 1000);
};

// ============================================================================
// ELECTRICITY LINE TRANSFORMERS
// ============================================================================

/**
 * Determine if AC current is present
 * @param {number} acDetected - AC detection value (0 = present, 1 = absent)
 * @returns {boolean} True if current present
 */
export const isACPresent = (acDetected) => {
  return acDetected === 0;
};

/**
 * Calculate AC health percentage
 * @param {number} acDetected - AC detection value
 * @returns {number} Health percentage (0 or 100)
 */
export const calculateACHealthPercent = (acDetected) => {
  return isACPresent(acDetected) ? 100 : 0;
};

/**
 * Get electricity line status
 * @param {number} acDetected - AC detection value
 * @returns {object} { status: 'normal'|'fault', message: string }
 */
export const getElectricityLineStatus = (acDetected) => {
  const acPresent = isACPresent(acDetected);

  if (!acPresent) {
    return { status: "fault", message: "No electricity detected" };
  }
  return { status: "normal", message: "Power supply normal" };
};

// ============================================================================
// DATA CABLE LINE TRANSFORMERS
// ============================================================================

/**
 * Calculate LDR voltage from raw ADC value
 * @param {number} ldrRaw - Raw LDR ADC value (0-4095)
 * @returns {number} Voltage (0-3.3V)
 */
export const calculateLDRVoltage = (ldrRaw) => {
  return (ldrRaw / 4095) * 3.3;
};

/**
 * Calculate brightness percentage from LDR
 * @param {number} ldrRaw - Raw LDR ADC value (0-4095)
 * @returns {number} Brightness percentage (0-100)
 */
export const calculateBrightnessPercent = (ldrRaw) => {
  const voltage = calculateLDRVoltage(ldrRaw);
  const brightness = (voltage / 3.3) * 100;
  return clamp(brightness, 0, 100);
};

/**
 * Get data cable line status
 * @param {number} brightnessPercent - Brightness percentage
 * @returns {object} { status: 'normal'|'warning'|'fault', message: string }
 */
export const getDataCableStatus = (brightnessPercent) => {
  if (brightnessPercent > 60) {
    return { status: "normal", message: "Signal strong" };
  }
  if (brightnessPercent < 30) {
    return { status: "fault", message: "Signal lost" };
  }
  return { status: "warning", message: "Signal weak" };
};

// ============================================================================
// NORMALIZATION FOR CHARTS
// ============================================================================

/**
 * Normalize water flow for chart display (0-100%)
 * @param {number} flowLPM - Flow in L/min
 * @returns {number} Normalized value (0-100)
 */
export const normalizeFlowForChart = (flowLPM) => {
  return clamp((flowLPM / 5) * 100, 0, 100);
};

/**
 * Normalize gas ADC value for chart display (0-100%)
 * @param {number} gasADC - Gas ADC value (0-4095)
 * @returns {number} Normalized value (0-100)
 */
export const normalizeGasForChart = (gasADC) => {
  return clamp((gasADC / 4095) * 100, 0, 100);
};

/**
 * Brightness is already in percentage, just clamp it
 * @param {number} brightnessPercent - Brightness percentage
 * @returns {number} Normalized value (0-100)
 */
export const normalizeLightForChart = (brightnessPercent) => {
  return clamp(brightnessPercent, 0, 100);
};

// ============================================================================
// COMPLETE SENSOR DATA TRANSFORMER
// ============================================================================

/**
 * Transform raw sensor data into dashboard-ready calculated values
 * @param {object} rawData - Raw sensor data from backend
 * @returns {object} Calculated values ready for display
 */
export const transformSensorData = (rawData) => {
  rawData = normalizeSensorData(rawData);
  // Extract raw values with defaults
  // Support both old and new key names for compatibility
  const flowRate = rawData.flow_rate;
  const waterLevel = rawData.water_level || 0;
  const gasData = {
    mq5_do1: rawData.mq5_do1 ?? 1,
    mq5_do2: rawData.mq5_do2 ?? 1,
    mq5_ao1: rawData.mq5_ao1 || 0,
    mq5_ao2: rawData.mq5_ao2 || 0,
  };
  const acDetected = rawData.ac_detected ?? 1;
  const ldrRaw = rawData.ldr_raw || rawData.ldr || 0;

  // Calculate derived values
  const flowLPM = calculateFlowLPM(flowRate);
  const waterLevelPercent = calculateWaterLevelPercent(waterLevel);
  const gasPresent = isGasPresent(gasData);
  const gasADC = getGasADCValue(gasData);
  const gasPPM = calculateGasPPM(gasADC);
  const acPresent = isACPresent(acDetected);
  const acHealthPercent = calculateACHealthPercent(acDetected);
  const ldrVoltage = calculateLDRVoltage(ldrRaw);
  const brightnessPercent = calculateBrightnessPercent(ldrRaw);

  // Calculate statuses
  const waterStatus = getWaterLineStatus(flowLPM, waterLevel);
  const gasStatus = getGasLineStatus(gasData);
  const electricityStatus = getElectricityLineStatus(acDetected);
  const dataCableStatus = getDataCableStatus(brightnessPercent);

  // Normalized values for charts
  const normalizedFlow = normalizeFlowForChart(flowLPM);
  const normalizedGas = normalizeGasForChart(gasADC);
  const normalizedLight = normalizeLightForChart(brightnessPercent);

  return {
    // Water Line
    water: {
      flowLPM: flowLPM.toFixed(1),
      waterLevelPercent,
      status: waterStatus.status,
      message: waterStatus.message,
      normalized: normalizedFlow,
    },
    // Gas Line
    gas: {
      present: gasPresent,
      ppm: gasPPM,
      adc: gasADC,
      digital: gasData.mq5_do1 === 0 || gasData.mq5_do2 === 0,
      status: gasStatus.status,
      message: gasStatus.message,
      normalized: normalizedGas,
    },
    // Electricity Line
    electricity: {
      present: acPresent,
      healthPercent: acHealthPercent,
      status: electricityStatus.status,
      message: electricityStatus.message,
      normalized: acPresent ? 100 : 0,
    },
    // Data Cable Line
    dataCable: {
      brightnessPercent: brightnessPercent.toFixed(1),
      voltage: ldrVoltage.toFixed(2),
      status: dataCableStatus.status,
      message: dataCableStatus.message,
      normalized: normalizedLight,
    },
    // Raw values (for debugging)
    raw: rawData,
  };
};

export default {
  clamp,
  calculateFlowLPM,
  calculateWaterLevelPercent,
  getWaterLineStatus,
  isGasPresent,
  getGasLineStatus,
  getGasADCValue,
  isACPresent,
  calculateACHealthPercent,
  getElectricityLineStatus,
  calculateLDRVoltage,
  calculateBrightnessPercent,
  getDataCableStatus,
  normalizeFlowForChart,
  normalizeGasForChart,
  normalizeLightForChart,
  normalizeSensorData,
  transformSensorData,
};
