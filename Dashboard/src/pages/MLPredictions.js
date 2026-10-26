/**
 * MLPredictions Page
 * Upload CSV sensor data → run ML fault detection on each row
 * → generate 50-year infrastructure lifespan forecast with charts
 */

import React, { useState, useRef, useCallback } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import GlobalHeader from "components/GlobalHeader";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import LinearProgress from "@mui/material/LinearProgress";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TimelineIcon from "@mui/icons-material/Timeline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import InsightsIcon from "@mui/icons-material/Insights";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Sensor display config
const SENSOR_CONFIG = {
  gas: { label: "Gas Line (MQ-5)", unit: "ppm", color: "#ef5350", bgColor: "rgba(239,83,80,0.12)" },
  water_flow: { label: "Water Flow Rate", unit: "L/min", color: "#42a5f5", bgColor: "rgba(66,165,245,0.12)" },
  water_level: { label: "Water Level", unit: "%", color: "#26c6da", bgColor: "rgba(38,198,218,0.12)" },
};

const RISK_COLORS = { normal: "#4caf50", warning: "#ff9800", critical: "#f44336" };

function MLPredictions() {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [dataSource, setDataSource] = useState(null); // "csv" | "database"

  // ─── Fetch from Database (live sensor data) ───
  const fetchFromDatabase = useCallback(async () => {
    const backendHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const backendBaseUrl = `http://${backendHost}:8000`;
    setLoading(true);
    setError(null);
    setFileName(null);
    setDataSource("database");

    try {
      // Fetch forecast and logs in parallel
      const [forecastRes, logsRes] = await Promise.all([
        fetch(`${backendBaseUrl}/api/forecast?horizon=50&unit=years`),
        fetch(`${backendBaseUrl}/api/logs?limit=100&hours=720`),
      ]);

      if (!forecastRes.ok) throw new Error("Failed to fetch forecast from database");

      const forecastData = await forecastRes.json();

      // Convert logs into row_predictions format
      let rowPredictions = [];
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        rowPredictions = (logsData.logs || []).map((log, idx) => ({
          row: idx,
          raw: log.raw || {},
          is_anomaly: log.ml?.isAnomaly || false,
          confidence: log.ml?.confidence || 0,
          severity: log.ml?.severity || "unknown",
          message: log.ml?.message || "",
        }));
      }

      // Merge into unified result format
      setResult({
        ...forecastData,
        row_predictions: rowPredictions,
        uploaded_rows: rowPredictions.length,
        filename: "PostgreSQL Database (Live Sensors)",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFile = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setDataSource("csv");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${backendBaseUrl}/api/forecast/upload?horizon=50&unit=years`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);

  // Download forecast as CSV
  const downloadForecast = () => {
    if (!result?.forecast) return;
    const headers = ["forecast_date", "year", "period", "sensor_type", "sensor_name", "predicted_value", "lower_bound", "upper_bound", "risk_level", "confidence", "health_score"];
    const csvRows = [headers.join(",")];
    result.forecast.forEach((r) => {
      csvRows.push(headers.map((h) => r[h] ?? "").join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forecast_50_years.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build chart data for a sensor
  const buildChartData = (sensorType) => {
    const records = result?.forecast_by_sensor?.[sensorType] || [];
    if (!records.length) return null;
    const cfg = SENSOR_CONFIG[sensorType] || { label: sensorType, color: "#999", bgColor: "rgba(153,153,153,0.12)" };

    return {
      labels: records.map((r) => r.year),
      datasets: [
        {
          label: `Predicted ${cfg.label}`,
          data: records.map((r) => r.predicted_value),
          borderColor: cfg.color,
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.35,
        },
        {
          label: "Upper Bound",
          data: records.map((r) => r.upper_bound),
          borderColor: "transparent",
          backgroundColor: cfg.bgColor,
          fill: "+1",
          pointRadius: 0,
          borderWidth: 0,
        },
        {
          label: "Lower Bound",
          data: records.map((r) => r.lower_bound),
          borderColor: "transparent",
          backgroundColor: cfg.bgColor,
          fill: "-1",
          pointRadius: 0,
          borderWidth: 0,
        },
      ],
    };
  };

  const chartOptions = (title, unit) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top", labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
      title: { display: true, text: title, font: { size: 14, weight: "bold" }, padding: { bottom: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2)} ${unit}`,
        },
      },
    },
    scales: {
      x: { title: { display: true, text: "Year" }, grid: { display: false } },
      y: { title: { display: true, text: unit || "Value" }, grid: { color: "rgba(0,0,0,0.05)" } },
    },
  });

  // Severity colour helper
  const severityColor = (sev) => {
    const map = { critical: "error", high: "warning", medium: "info", low: "success", unknown: "default" };
    return map[sev] || "default";
  };

  const summary = result?.summary;
  const anomalyCount = result?.row_predictions?.filter((r) => r.is_anomaly).length || 0;
  const totalRows = result?.row_predictions?.length || 0;

  return (
    <>
      <GlobalHeader />
      <DashboardLayout>
        <MDBox py={3} pt={3}>
          {/* Page Header */}
          <MDBox mb={3}>
            <MDBox display="flex" alignItems="center" gap={1.5} mb={0.5}>
              <InsightsIcon sx={{ fontSize: 32, color: "#1976d2" }} />
              <MDTypography variant="h4" fontWeight="bold">
                Infrastructure Diagnostics
              </MDTypography>
            </MDBox>
            <MDTypography variant="body2" color="text">
              Use live sensor readings or uploaded records to assess fault conditions and review long-term asset health.
            </MDTypography>
          </MDBox>

          {/* ─── Data Source Selection ─── */}
          <Grid container spacing={3} mb={3}>
            {/* Option 1: Database Sensor Data */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  border: dataSource === "database" ? "2px solid #1976d2" : "2px solid #e2e8f0",
                  backgroundColor: dataSource === "database" ? "rgba(25,118,210,0.04)" : "transparent",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  "&:hover": { borderColor: "#1976d2", boxShadow: "0 4px 20px rgba(25,118,210,0.15)" },
                }}
                onClick={(e) => { e.stopPropagation(); fetchFromDatabase(); }}
              >
                <MDBox textAlign="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      backgroundColor: "rgba(25,118,210,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                    }}
                  >
                    <TimelineIcon sx={{ fontSize: 28, color: "#1976d2" }} />
                  </Box>
                  <MDTypography variant="h6" fontWeight="bold" mb={0.5}>
                    Live Asset Data
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    Pull live readings from the database to review fault conditions and assess long-term infrastructure health.
                  </MDTypography>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={loading}
                    sx={{
                      mt: 2,
                      color: "#fff",
                      backgroundColor: "#1976d2",
                      fontWeight: 700,
                      "&:hover": { backgroundColor: "#1565c0" },
                      "&.Mui-disabled": { color: "#fff", backgroundColor: "#90caf9" },
                    }}
                    onClick={(e) => { e.stopPropagation(); fetchFromDatabase(); }}
                  >
                    {loading && dataSource === "database" ? "Analyzing…" : "Review Database"}
                  </Button>
                </MDBox>
              </Card>
            </Grid>

            {/* Option 2: CSV Upload */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  border: dragActive
                    ? "2px dashed #1976d2"
                    : dataSource === "csv"
                    ? "2px solid #1976d2"
                    : "2px dashed #cbd5e1",
                  backgroundColor: dragActive ? "rgba(25,118,210,0.04)" : "transparent",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  "&:hover": { borderColor: "#1976d2" },
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />
                <MDBox textAlign="center">
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,152,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 28, color: "#ff9800" }} />
                  </Box>
                  <MDTypography variant="h6" fontWeight="bold" mb={0.5}>
                    Upload CSV File
                  </MDTypography>
                  <MDTypography variant="caption" color="text">
                    Drag & drop or click to upload a CSV with sensor columns (mq5_ao1, flow_rate, water_level, etc.)
                  </MDTypography>
                  {fileName && !loading && (
                    <Chip label={fileName} size="small" color="info" variant="outlined" sx={{ mt: 1.5, display: "block", mx: "auto", width: "fit-content" }} />
                  )}
                </MDBox>
              </Card>
            </Grid>
          </Grid>

          {loading && <LinearProgress sx={{ mb: 3, borderRadius: 4 }} />}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* ─── Results ─── */}
          {result && (
            <>
              {/* Summary Cards */}
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      p: 2.5,
                      textAlign: "center",
                      background: "linear-gradient(135deg, rgba(76,175,80,0.08), rgba(76,175,80,0.02))",
                    }}
                  >
                    <MDTypography variant="caption" color="text" textTransform="uppercase" fontWeight="bold">
                      Overall Health Score
                    </MDTypography>
                    <MDTypography
                      variant="h2"
                      fontWeight="bold"
                      color={summary?.overall_health_score >= 60 ? "success" : summary?.overall_health_score >= 30 ? "warning" : "error"}
                    >
                      {summary?.overall_health_score ?? "—"}%
                    </MDTypography>
                    <MDTypography variant="caption" color="text">
                      End-of-projection health
                    </MDTypography>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      p: 2.5,
                      textAlign: "center",
                      background: "linear-gradient(135deg, rgba(244,67,54,0.08), rgba(244,67,54,0.02))",
                    }}
                  >
                    <MDTypography variant="caption" color="text" textTransform="uppercase" fontWeight="bold">
                      Critical Milestone
                    </MDTypography>
                    <MDTypography variant="h2" fontWeight="bold" color="error">
                      {summary?.critical_milestone_year ?? "—"}
                    </MDTypography>
                    <MDTypography variant="caption" color="text">
                      First critical risk year
                    </MDTypography>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      p: 2.5,
                      textAlign: "center",
                      background: "linear-gradient(135deg, rgba(255,167,38,0.08), rgba(255,167,38,0.02))",
                    }}
                  >
                    <MDTypography variant="caption" color="text" textTransform="uppercase" fontWeight="bold">
                      Highest Risk Utility
                    </MDTypography>
                    <MDTypography variant="h5" fontWeight="bold" color="warning" sx={{ mt: 0.5 }}>
                      {summary?.highest_risk_utility ?? "—"}
                    </MDTypography>
                    <MDTypography variant="caption" color="text">
                      Needs priority maintenance
                    </MDTypography>
                  </Card>
                </Grid>

              </Grid>

              {/* ML Fault Analysis on Uploaded Data */}
              <Card sx={{ mb: 3 }}>
                <MDBox p={2.5}>
                  <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <TimelineIcon color="primary" />
                      <MDTypography variant="h6" fontWeight="bold">
                        Per-Row ML Fault Analysis
                      </MDTypography>
                    </MDBox>
                    <MDBox display="flex" gap={1}>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={`${totalRows - anomalyCount} Normal`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        icon={<WarningAmberIcon />}
                        label={`${anomalyCount} Faults`}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    </MDBox>
                  </MDBox>

                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Row</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Severity</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Confidence</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Message</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(result.row_predictions || []).slice(0, 50).map((pred) => (
                          <TableRow
                            key={pred.row}
                            sx={{
                              backgroundColor: pred.is_anomaly ? "rgba(244,67,54,0.04)" : "transparent",
                              "&:hover": { backgroundColor: pred.is_anomaly ? "rgba(244,67,54,0.08)" : "rgba(0,0,0,0.02)" },
                            }}
                          >
                            <TableCell>{pred.row + 1}</TableCell>
                            <TableCell>
                              <Chip
                                label={pred.is_anomaly ? "FAULT" : "NORMAL"}
                                size="small"
                                color={pred.is_anomaly ? "error" : "success"}
                                sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={(pred.severity || "—").toUpperCase()}
                                size="small"
                                color={severityColor(pred.severity)}
                                variant="outlined"
                                sx={{ fontSize: "0.7rem" }}
                              />
                            </TableCell>
                            <TableCell>{(pred.confidence * 100).toFixed(0)}%</TableCell>
                            <TableCell sx={{ maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {pred.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {totalRows > 50 && (
                    <MDTypography variant="caption" color="text" sx={{ mt: 1, display: "block" }}>
                      Showing first 50 of {totalRows} rows
                    </MDTypography>
                  )}
                </MDBox>
              </Card>

              {/* 50-Year Forecast Charts */}
              <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <MDBox display="flex" alignItems="center" gap={1}>
                  <InsightsIcon color="info" />
                  <MDTypography variant="h6" fontWeight="bold">
                    50-Year Infrastructure Forecast
                  </MDTypography>
                </MDBox>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={downloadForecast}
                  sx={{
                    color: "#fff",
                    backgroundColor: "#0b4f71",
                    "&:hover": { backgroundColor: "#083b55" },
                  }}
                >
                  Export CSV
                </Button>
              </MDBox>

              <Grid container spacing={3} mb={3}>
                {Object.entries(SENSOR_CONFIG).map(([sensorType, cfg]) => {
                  const chartData = buildChartData(sensorType);
                  if (!chartData) return null;
                  const records = result.forecast_by_sensor?.[sensorType] || [];
                  const endHealth = records.length ? records[records.length - 1].health_score : null;
                  const endRisk = records.length ? records[records.length - 1].risk_level : null;

                  return (
                    <Grid item xs={12} md={6} key={sensorType}>
                      <Card sx={{ height: "100%" }}>
                        <MDBox p={2}>
                          <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <MDBox display="flex" alignItems="center" gap={1}>
                              <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: cfg.color }} />
                              <MDTypography variant="button" fontWeight="bold">
                                {cfg.label}
                              </MDTypography>
                            </MDBox>
                            <MDBox display="flex" gap={0.5}>
                              {endRisk && (
                                <Chip
                                  label={endRisk.toUpperCase()}
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.65rem",
                                    backgroundColor: RISK_COLORS[endRisk] || "#999",
                                    color: "#fff",
                                  }}
                                />
                              )}
                              {endHealth !== null && (
                                <Chip
                                  label={`${endHealth}% health`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: "0.65rem" }}
                                />
                              )}
                            </MDBox>
                          </MDBox>
                          <Box sx={{ height: 260 }}>
                            <Line data={chartData} options={chartOptions(cfg.label, cfg.unit)} />
                          </Box>
                        </MDBox>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Risk Timeline Table */}
              <Card sx={{ mb: 3 }}>
                <MDBox p={2.5}>
                  <MDTypography variant="h6" fontWeight="bold" mb={2}>
                    Risk Timeline Overview
                  </MDTypography>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Year</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Sensor</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Predicted Value</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Bounds</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Risk</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Health</TableCell>
                          <TableCell sx={{ fontWeight: 700, backgroundColor: "#f8fafc" }}>Confidence</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(result.forecast || [])
                          .filter((r) => r.risk_level === "critical" || r.risk_level === "warning")
                          .slice(0, 60)
                          .map((r, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ fontWeight: 600 }}>{r.year}</TableCell>
                              <TableCell>{r.sensor_name}</TableCell>
                              <TableCell>{r.predicted_value}</TableCell>
                              <TableCell sx={{ fontSize: "0.75rem" }}>
                                {r.lower_bound} – {r.upper_bound}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={r.risk_level.toUpperCase()}
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.65rem",
                                    backgroundColor: RISK_COLORS[r.risk_level] || "#999",
                                    color: "#fff",
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <MDBox display="flex" alignItems="center" gap={0.5}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={r.health_score}
                                    sx={{
                                      width: 60,
                                      height: 6,
                                      borderRadius: 3,
                                      backgroundColor: "rgba(0,0,0,0.08)",
                                      "& .MuiLinearProgress-bar": {
                                        backgroundColor:
                                          r.health_score >= 60 ? "#4caf50" : r.health_score >= 30 ? "#ff9800" : "#f44336",
                                      },
                                    }}
                                  />
                                  <MDTypography variant="caption">{r.health_score}%</MDTypography>
                                </MDBox>
                              </TableCell>
                              <TableCell>{(r.confidence * 100).toFixed(0)}%</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </MDBox>
              </Card>

              {/* Metadata */}
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Source:</strong> {dataSource === "database" ? "PostgreSQL Database (Live Sensors)" : result.filename || "CSV Upload"}
                {" • "}
                <strong>{result.uploaded_rows}</strong> data rows ({result.source_rows} sensor points)
                {" • "}{result.forecast_count} predictions across {summary?.utilities_monitored} utilities
                {" • "}Generated at {result.generated_at?.split("T")[0]}
              </Alert>
            </>
          )}
        </MDBox>
      </DashboardLayout>
    </>
  );
}

export default MLPredictions;
