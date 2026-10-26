/**
 * Logs Component
 * Real-time sensor data logs with filtering and export
 */

import React, { useState, useEffect } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import GlobalHeader from "components/GlobalHeader";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import DownloadIcon from "@mui/icons-material/Download";
import { Line } from "react-chartjs-2";
import { calculateGasPPM, normalizeSensorData } from "utils/sensorTransformers";
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Logs() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Chart data state (keep last 20 points for each sensor)
  const [chartData, setChartData] = useState({
    gas: [],
    waterFlow: [],
    waterLevel: [],
    acPower: [],
    ldr: [],
    timestamps: [],
  });

  useEffect(() => {
    let reconnectTimer;
    let disposed = false;
    const backendHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const backendBaseUrl = `http://${backendHost}:8000`;
    const backendWsUrl = `ws://${backendHost}:8000/ws/sensordata`;

    const addLogEntry = (data) => {
      if (!data?.raw) return;

      const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date(data.timestamp || Date.now()),
        device_id: data.device_id || "tx_esp32_01",
        raw: normalizeSensorData(data.raw),
        computed: data.computed,
        ml: data.ml,
      };

      setLogs((prevLogs) => {
        const newLogs = [logEntry, ...prevLogs]
          .filter(
            (log, index, source) =>
              source.findIndex(
                (candidate) =>
                  candidate.timestamp?.getTime?.() === log.timestamp?.getTime?.() &&
                  candidate.raw?.mq5_ao1 === log.raw?.mq5_ao1 &&
                  candidate.raw?.flow_lpm === log.raw?.flow_lpm
              ) === index
          )
          .slice(0, 25);
        localStorage.setItem("faultEyeLogs", JSON.stringify(newLogs));
        window.dispatchEvent(new CustomEvent("sensor-log-updated", { detail: logEntry }));
        return newLogs;
      });

      return logEntry;
    };

    // Fetch real historical readings from PostgreSQL database
    const fetchDatabaseLogs = () => {
      fetch(`${backendBaseUrl}/api/logs?limit=50`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.logs && data.logs.length > 0 && !disposed) {
            const mappedLogs = data.logs.map((item) => ({
              id: item.id || Date.now() + Math.random(),
              timestamp: new Date(item.timestamp),
              device_id: item.device_id,
              raw: normalizeSensorData(item.raw),
              ml: item.ml,
            }));
            setLogs(mappedLogs);
          } else {
            // Fallback to latest reading if DB returns 0 logs
            fetch(`${backendBaseUrl}/api/live`)
              .then((r) => (r.ok ? r.json() : null))
              .then((live) => {
                if (!live?.live_data || disposed) return;
                const sensors = live.live_data;
                addLogEntry({
                  timestamp: live.timestamp,
                  raw: normalizeSensorData({
                    mq5_ao1: sensors.gas?.value,
                    flow_rate: sensors.water_flow?.value,
                    water_level: sensors.water_level?.value,
                    ac_detected: sensors.ac_current?.value,
                    ldr_raw: sensors.light?.value,
                    ldr_voltage: sensors.light_voltage?.value,
                  }),
                  device_id: "backend-latest",
                });
              });
          }
        })
        .catch((err) => console.error("Error fetching database logs:", err));
    };

    fetchDatabaseLogs();

    // Connect to main sensor data WebSocket
    let ws;
    const connect = () => {
      if (disposed) return;
      ws = new WebSocket(backendWsUrl);

      ws.onopen = () => {
        console.log("📝 Connected to sensor data WebSocket");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Process all sensor data messages (backend sends full dashboard data)
          if (data.raw) {
            addLogEntry(data);

            // Update chart data (keep last 20 points)
            const timeLabel = new Date(data.timestamp || Date.now()).toLocaleTimeString("en-US", {
              hour12: false,
            });
            setChartData((prev) => ({
              gas: [...prev.gas, calculateGasPPM(data.raw?.mq5_ao1 || 0)].slice(-20),
              waterFlow: [...prev.waterFlow, data.raw?.flow_lpm ?? data.raw?.flow_rate ?? 0].slice(-20),
              waterLevel: [...prev.waterLevel, data.raw?.water_level || 0].slice(-20),
              acPower: [...prev.acPower, data.raw?.ac_detected || 0].slice(-20),
              ldr: [...prev.ldr, data.raw?.ldr_raw || 0].slice(-20),
              timestamps: [...prev.timestamps, timeLabel].slice(-20),
            }));
          }
        } catch (err) {
          console.error("Failed to parse log message:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("📝 Disconnected from sensor data WebSocket");
        setIsConnected(false);
        if (!disposed) reconnectTimer = setTimeout(connect, 1000);
      };
    };

    connect();

    // Cleanup on unmount
    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Format sensor value for display
  const formatValue = (key, value) => {
    if (typeof value === "boolean") return value ? "YES" : "NO";
    if (typeof value === "number") return value.toFixed(2);
    return String(value);
  };

  const formatGasPPM = (value) => `${calculateGasPPM(Number(value || 0))} ppm`;

  // Rule-based fault evaluation used as the live system status
  const getMLStatus = (log) => {
    const raw = log.raw || {};
    const gasPpm = calculateGasPPM(Number(raw.mq5_ao1 || 0));
    const gasRaw = Number(raw.mq5_ao1 || 0);
    const gasDigital = Number(raw.mq5_do1 ?? 1);
    const waterFlow = Number(raw.flow_rate ?? raw.flow_lpm ?? 0);
    const acDetected = Number(raw.ac_detected ?? 1);

    if (gasPpm > 400 || gasRaw > 400 || gasDigital === 0) {
      return { isFault: true, label: "FAULT", color: "error", severity: "critical" };
    } else if (waterFlow > 5.0) {
      return { isFault: true, label: "FAULT", color: "error", severity: "high" };
    } else if (acDetected === 0) {
      return { isFault: true, label: "FAULT", color: "error", severity: "critical" };
    } else if (log.ml?.isAnomaly) {
      return { isFault: true, label: "FAULT", color: "error", severity: log.ml?.severity || "medium" };
    } else {
      return { isFault: false, label: "NORMAL", color: "success", severity: "low" };
    }
  };

  const downloadCsv = () => {
    const headers = [
      "timestamp",
      "device_id",
      "source",
      "gas_ppm",
      "water_flow_lpm",
      "water_level",
      "ac_detected",
      "ldr_raw",
      "ml_status",
      "ml_severity",
      "ml_confidence",
    ];
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = logs.map((log) => [
      log.timestamp instanceof Date ? log.timestamp.toISOString() : log.timestamp,
      log.device_id,
      log.source || "live sensor",
      calculateGasPPM(Number(log.raw?.mq5_ao1 || 0)),
      log.raw?.flow_rate || 0,
      log.raw?.water_level || 0,
      log.raw?.ac_detected || 0,
      log.raw?.ldr_raw || 0,
      getMLStatus(log).label,
      getMLStatus(log).severity,
      log.ml?.confidence ?? log.ml?.fault_probability ?? 0.95,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `incident-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <GlobalHeader />
      <DashboardLayout>
        <MDBox py={3} pt={3}>
          {/* Connection Status */}
          {!isConnected && (
            <Alert severity="error" sx={{ mb: 2 }}>
              ⚠️ Disconnected from backend - Waiting for reconnection...
            </Alert>
          )}

          {/* Page Header */}
          <MDBox mb={3}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
              <MDBox>
                <MDTypography variant="h4" fontWeight="bold" sx={{ letterSpacing: 0.3 }}>
                  Sensor Logs
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  Real-time sensor data stream from ESP32 transmitter
                </MDTypography>
                <Chip
                  label={isConnected ? "Live" : "Offline"}
                  color={isConnected ? "success" : "error"}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </MDBox>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant={statusFilter === "all" ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setStatusFilter("all")}
                  sx={{
                    color: statusFilter === "all" ? "#ffffff" : "#1f2937",
                    backgroundColor: statusFilter === "all" ? "#0b4f71" : "transparent",
                    borderColor: "#0b4f71",
                    boxShadow: statusFilter === "all" ? "none" : "none",
                    "&:hover": {
                      backgroundColor: statusFilter === "all" ? "#083b55" : "rgba(11,79,113,0.08)",
                      borderColor: "#0b4f71",
                    },
                  }}
                >
                  All Logs ({logs.length})
                </Button>
                <Button
                  variant={statusFilter === "faults" ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setStatusFilter("faults")}
                  sx={{
                    color: statusFilter === "faults" ? "#ffffff" : "#b42318",
                    backgroundColor: statusFilter === "faults" ? "#dc2626" : "transparent",
                    borderColor: "#dc2626",
                    "&:hover": {
                      backgroundColor: statusFilter === "faults" ? "#b91c1c" : "rgba(220,38,38,0.08)",
                      borderColor: "#dc2626",
                    },
                  }}
                >
                  Faults Only
                </Button>
                <Button
                  variant={statusFilter === "normal" ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setStatusFilter("normal")}
                  sx={{
                    color: statusFilter === "normal" ? "#ffffff" : "#1f7a5a",
                    backgroundColor: statusFilter === "normal" ? "#2e7d5c" : "transparent",
                    borderColor: "#2e7d5c",
                    "&:hover": {
                      backgroundColor: statusFilter === "normal" ? "#246c4d" : "rgba(46,125,92,0.08)",
                      borderColor: "#2e7d5c",
                    },
                  }}
                >
                  Normal Only
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={downloadCsv}
                  disabled={logs.length === 0}
                  sx={{
                    color: "#ffffff",
                    backgroundColor: "#0b4f71",
                    "& .MuiButton-startIcon": { color: "#ffffff" },
                    "&:hover": { backgroundColor: "#083b55" },
                    "&.Mui-disabled": { color: "#ffffff", backgroundColor: "#64748b" },
                  }}
                >
                  Download CSV
                </Button>
              </Box>
            </MDBox>
          </MDBox>

          {/* Logs Table */}
          <Card sx={{ mb: 3 }}>
            <MDBox p={2}>
              <MDTypography variant="h6" fontWeight="bold" mb={2}>
                📋 Sensor Incident Records ({logs.length})
              </MDTypography>
              <TableContainer sx={{ maxHeight: "70vh", overflowX: "auto" }}>
                <Table
                  stickyHeader
                  sx={{
                    tableLayout: "fixed",
                    width: 1040,
                    minWidth: 1040,
                    "& th, & td": {
                      boxSizing: "border-box",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                    "& th:nth-of-type(1), & td:nth-of-type(1)": { width: 150, maxWidth: 150 },
                    "& th:nth-of-type(2), & td:nth-of-type(2)": { width: 170, maxWidth: 170 },
                    "& th:nth-of-type(3), & td:nth-of-type(3)": { width: 110, maxWidth: 110 },
                    "& th:nth-of-type(4), & td:nth-of-type(4)": { width: 150, maxWidth: 150 },
                    "& th:nth-of-type(5), & td:nth-of-type(5)": { width: 110, maxWidth: 110 },
                    "& th:nth-of-type(6), & td:nth-of-type(6)": { width: 110, maxWidth: 110 },
                    "& th:nth-of-type(7), & td:nth-of-type(7)": { width: 110, maxWidth: 110 },
                    "& th:nth-of-type(8), & td:nth-of-type(8)": { width: 130, maxWidth: 130 },
                  }}
                >
                  <colgroup>
                    <col style={{ width: 150 }} />
                    <col style={{ width: 170 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 130 }} />
                  </colgroup>
                  <TableHead sx={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
                    <TableRow>
                      <TableCell align="left" sx={{ py: 2 }}>
                        <MDTypography
                          variant="caption"
                          fontWeight="bold"
                          textTransform="uppercase"
                          sx={{ letterSpacing: "0.5px" }}
                        >
                          Timestamp
                        </MDTypography>
                      </TableCell>
                      <TableCell align="left" sx={{ py: 2 }}>
                        <MDTypography
                          variant="caption"
                          fontWeight="bold"
                          textTransform="uppercase"
                          sx={{ letterSpacing: "0.5px" }}
                        >
                          Device ID
                        </MDTypography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <MDTypography
                          variant="caption"
                          fontWeight="bold"
                          textTransform="uppercase"
                          sx={{ letterSpacing: "0.5px" }}
                        >
                          Gas (PPM)
                        </MDTypography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <MDTypography
                          variant="caption"
                          fontWeight="bold"
                          textTransform="uppercase"
                          sx={{ letterSpacing: "0.5px" }}
                        >
                          Water Flow (L/min)
                        </MDTypography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <MDTypography
                          variant="caption"
                          fontWeight="bold"
                          textTransform="uppercase"
                          sx={{ letterSpacing: "0.5px" }}
                        >
                          Water Level
                        </MDTypography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <MDTypography
                          variant="caption"
                          fontWeight="bold"
                          textTransform="uppercase"
                          sx={{ letterSpacing: "0.5px" }}
                        >
                          AC Power
                        </MDTypography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <MDTypography
                          variant="caption"
                          fontWeight="bold"
                          textTransform="uppercase"
                          sx={{ letterSpacing: "0.5px" }}
                        >
                          LDR (ADC)
                        </MDTypography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <MDTypography
                          variant="caption"
                          fontWeight="bold"
                          textTransform="uppercase"
                          sx={{ letterSpacing: "0.5px" }}
                        >
                          Rule Status
                        </MDTypography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs
                      .filter((log) => {
                        if (statusFilter === "all") return true;
                        const s = getMLStatus(log);
                        if (statusFilter === "faults") return s.isFault;
                        if (statusFilter === "normal") return !s.isFault;
                        return true;
                      })
                      .map((log) => (
                      <TableRow
                        key={log.id}
                        hover
                        sx={{
                          "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                          borderBottom: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        <TableCell align="left" sx={{ py: 2 }}>
                          <MDTypography
                            variant="caption"
                            sx={{ fontSize: "0.75rem", fontFamily: "monospace" }}
                          >
                            {log.timestamp.toLocaleTimeString("en-US", { hour12: false })}
                          </MDTypography>
                        </TableCell>
                        <TableCell align="left" sx={{ py: 2 }}>
                          <MDTypography
                            variant="caption"
                            sx={{ fontSize: "0.75rem", fontWeight: 500 }}
                          >
                            {log.device_id}
                          </MDTypography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <MDTypography variant="caption" sx={{ fontSize: "0.75rem" }}>
                            {formatGasPPM(log.raw?.mq5_ao1)}
                          </MDTypography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <MDTypography variant="caption" sx={{ fontSize: "0.75rem" }}>
                            {formatValue("flow", log.raw?.flow_rate || 0)}
                          </MDTypography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <MDTypography variant="caption" sx={{ fontSize: "0.75rem" }}>
                            {formatValue("level", log.raw?.water_level || 0)}
                          </MDTypography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <Chip
                            label={log.raw?.ac_detected === 1 ? "Yes" : "No"}
                            color={log.raw?.ac_detected === 1 ? "success" : "error"}
                            size="small"
                            sx={{ minWidth: 50, fontSize: "0.7rem", fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          <MDTypography variant="caption" sx={{ fontSize: "0.75rem" }}>
                            {formatValue("ldr", log.raw?.ldr_raw || 0)}
                          </MDTypography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2 }}>
                          {(() => {
                            const status = getMLStatus(log);
                            return (
                              <Chip
                                label={status.label}
                                color={status.color}
                                size="small"
                                sx={{ minWidth: 80, fontSize: "0.7rem", fontWeight: 500 }}
                              />
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </MDBox>
          </Card>

          {/* Live Pipeline Graphs */}
          <MDBox mb={3}>
            <MDTypography variant="h5" fontWeight="bold" mb={2} sx={{ letterSpacing: 0.2 }}>
              Live Pipeline Monitoring
            </MDTypography>
            <MDTypography variant="caption" color="text" sx={{ display: "block", mb: 1, opacity: 0.8 }}>
              Rule-based diagnostics are active: gas, flow, and power thresholds determine the live status.
            </MDTypography>
            <Grid container spacing={3}>
              {/* Gas Line Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <MDBox p={2}>
                    <MDTypography variant="h6" fontWeight="medium" mb={2}>
                      Gas Line (PPM)
                    </MDTypography>
                    <Line
                      data={{
                        labels: chartData.timestamps,
                        datasets: [
                          {
                            label: "Gas Concentration",
                            data: chartData.gas,
                            borderColor: "#9C27B0",
                            backgroundColor: "rgba(156, 39, 176, 0.1)",
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 2,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => `Gas: ${context.parsed.y.toFixed(0)} PPM`,
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: "PPM" },
                            grid: { color: "rgba(0,0,0,0.05)" },
                          },
                          x: {
                            reverse: false, // Latest data on the right
                            grid: { display: false },
                          },
                        },
                      }}
                    />
                  </MDBox>
                </Card>
              </Grid>

              {/* Water Flow Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <MDBox p={2}>
                    <MDTypography variant="h6" fontWeight="medium" mb={2}>
                      Water Line (Flow Rate)
                    </MDTypography>
                    <Line
                      data={{
                        labels: chartData.timestamps,
                        datasets: [
                          {
                            label: "Flow Rate",
                            data: chartData.waterFlow,
                            borderColor: "#2196F3",
                            backgroundColor: "rgba(33, 150, 243, 0.1)",
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 2,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => `Flow: ${context.parsed.y.toFixed(2)} L/min`,
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: "L/min" },
                            grid: { color: "rgba(0,0,0,0.05)" },
                          },
                          x: {
                            reverse: false, // Latest data on the right
                            grid: { display: false },
                          },
                        },
                      }}
                    />
                  </MDBox>
                </Card>
              </Grid>

              {/* Power Line Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <MDBox p={2}>
                    <MDTypography variant="h6" fontWeight="medium" mb={2}>
                      Power Line Status
                    </MDTypography>
                    <Line
                      data={{
                        labels: chartData.timestamps,
                        datasets: [
                          {
                            label: "AC Power",
                            data: chartData.acPower,
                            borderColor: "#009688",
                            backgroundColor: "rgba(0, 150, 136, 0.1)",
                            fill: true,
                            tension: 0,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                            stepped: true,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 2,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) =>
                                context.parsed.y === 100 ? "AC: Present" : "AC: Absent",
                            },
                          },
                        },
                        scales: {
                          y: {
                            min: 0,
                            max: 100,
                            ticks: {
                              callback: (value) => (value === 100 ? "ON" : "OFF"),
                            },
                            title: { display: true, text: "Status" },
                            grid: { color: "rgba(0,0,0,0.05)" },
                          },
                          x: {
                            reverse: false, // Latest data on the right
                            grid: { display: false },
                          },
                        },
                      }}
                    />
                  </MDBox>
                </Card>
              </Grid>

              {/* Data Cable Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <MDBox p={2}>
                    <MDTypography variant="h6" fontWeight="medium" mb={2}>
                      Data Cable (Light Level)
                    </MDTypography>
                    <Line
                      data={{
                        labels: chartData.timestamps,
                        datasets: [
                          {
                            label: "LDR Raw Value",
                            data: chartData.ldr,
                            borderColor: "#E91E63",
                            backgroundColor: "rgba(233, 30, 99, 0.1)",
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointHoverRadius: 5,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 2,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => `LDR: ${context.parsed.y.toFixed(0)} ADC`,
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: "ADC Value" },
                            grid: { color: "rgba(0,0,0,0.05)" },
                          },
                          x: {
                            reverse: false, // Latest data on the right
                            grid: { display: false },
                          },
                        },
                      }}
                    />
                  </MDBox>
                </Card>
              </Grid>
            </Grid>
          </MDBox>
        </MDBox>
      </DashboardLayout>
    </>
  );
}

export default Logs;
