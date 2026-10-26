import React, { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { calculateGasPPM } from "utils/sensorTransformers";

const CSV_FIELDS = {
  timestamp: ["timestamp", "time", "ts"],
  gas: ["mq5_ao1", "gas_adc", "gas"],
  flow: ["flow_rate", "flow_lpm", "water_flow"],
  level: ["water_level", "level"],
  power: ["ac_detected", "power"],
  ldr: ["ldr_raw", "ldr"],
};

const findField = (row, names) => {
  const key = Object.keys(row).find((candidate) => names.includes(candidate.trim().toLowerCase()));
  return key ? row[key] : undefined;
};

const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce((row, header, index) => ({ ...row, [header]: values[index]?.trim() || "" }), {});
  });
};

function CsvPlaybackPanel() {
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const [status, setStatus] = useState("No CSV selected");
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => stopPlayback(), []);

  const stopPlayback = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  };

  const startPlayback = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    stopPlayback();

    const rows = parseCsv(await file.text());
    if (!rows.length) {
      setStatus("CSV has no data rows");
      return;
    }

    let index = 0;
    const publishRow = () => {
      const row = rows[index];
      const gasAdc = Number(findField(row, CSV_FIELDS.gas) || 0);
      const flow = Number(findField(row, CSV_FIELDS.flow) || 0);
      const level = Number(findField(row, CSV_FIELDS.level) || 0);
      const power = Number(findField(row, CSV_FIELDS.power) || 0);
      const ldr = Number(findField(row, CSV_FIELDS.ldr) || 0);
      const gasPpm = calculateGasPPM(gasAdc);
      const faultProbability = Math.min(0.99, Math.max(0.05, Math.max(gasPpm / 1000, flow / 30)));
      const isAnomaly = gasPpm > 400 || flow > 18 || power === 0;
      const severity = faultProbability > 0.8 ? "critical" : faultProbability > 0.5 ? "high" : faultProbability > 0.3 ? "medium" : "low";
      const log = {
        id: Date.now() + index,
        timestamp: new Date(findField(row, CSV_FIELDS.timestamp) || Date.now()),
        device_id: "csv-playback",
        source: "CSV offline simulation",
        raw: { mq5_ao1: gasAdc, flow_rate: flow, water_level: level, ac_detected: power, ldr_raw: ldr },
        ml: { isAnomaly, confidence: faultProbability, fault_probability: faultProbability, severity, source: "offline rule estimate" },
      };
      const previous = JSON.parse(localStorage.getItem("faultEyeLogs") || "[]");
      const next = [log, ...previous].slice(0, 100);
      localStorage.setItem("faultEyeLogs", JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("sensor-log-updated", { detail: log }));
      setStatus(`Playing row ${index + 1} of ${rows.length}`);
      index += 1;
      if (index >= rows.length) {
        stopPlayback();
        setStatus(`Completed ${rows.length} CSV readings`);
      }
    };

    publishRow();
    if (rows.length > 1) {
      timerRef.current = setInterval(publishRow, 1500);
      setPlaying(true);
    }
  };

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
        <MDBox>
          <MDTypography variant="h6" fontWeight="bold">CSV Offline Demonstration</MDTypography>
          <MDTypography variant="body2" color="text">
            Replay timestamp, gas ADC, flow, water level, power, and LDR readings through the response analysis.
          </MDTypography>
        </MDBox>
        <MDBox display="flex" alignItems="center" gap={1}>
          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={startPlayback} style={{ display: "none" }} />
          <Button
            variant="contained"
            size="small"
            onClick={() => inputRef.current?.click()}
            disabled={playing}
            sx={{
              color: "#ffffff",
              backgroundColor: "#0b4f71",
              fontWeight: 700,
              "&:hover": { backgroundColor: "#083b55" },
              "&.Mui-disabled": { color: "#ffffff", backgroundColor: "#64748b" },
            }}
          >
            Select CSV
          </Button>
          {playing && <Button variant="contained" color="error" size="small" onClick={stopPlayback}>Stop</Button>}
          <Chip label={status} size="small" color={playing ? "info" : "default"} />
        </MDBox>
      </MDBox>
      <Alert severity="info" sx={{ mt: 2 }}>
        CSV playback uses an offline rule estimate for demonstrations. Hardware readings use the backend ML prediction pipeline.
      </Alert>
    </Card>
  );
}

export default CsvPlaybackPanel;
