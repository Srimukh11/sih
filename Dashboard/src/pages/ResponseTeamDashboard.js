import React, { useEffect, useState } from "react";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import GlobalHeader from "components/GlobalHeader";
import ResponseTeamBuilder from "components/ResponseTeamBuilder";
import FieldTestMetrics from "components/FieldTestMetrics";
import CsvPlaybackPanel from "components/CsvPlaybackPanel";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Line } from "react-chartjs-2";
import { calculateGasPPM, normalizeSensorData } from "utils/sensorTransformers";
import { useWebSocket } from "hooks/useWebSocket";
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

function ResponseTeamDashboard() {
  const { connected, data: liveData } = useWebSocket();
  const [csvExpanded, setCsvExpanded] = useState(false);

  const readStoredLogs = () => {
    const saved = localStorage.getItem("faultEyeLogs");
    if (!saved) return [];

    try {
      return JSON.parse(saved).map((log) => ({ ...log, timestamp: new Date(log.timestamp) }));
    } catch (error) {
      console.error("Failed to parse stored logs for response dashboard:", error);
      return [];
    }
  };

  const [logs, setLogs] = useState(readStoredLogs);

  useEffect(() => {
    const refreshLogs = () => setLogs(readStoredLogs());

    window.addEventListener("sensor-log-updated", refreshLogs);
    window.addEventListener("storage", refreshLogs);

    return () => {
      window.removeEventListener("sensor-log-updated", refreshLogs);
      window.removeEventListener("storage", refreshLogs);
    };
  }, []);

  const liveLogs = (liveData?.history || []).map((payload) => ({
    timestamp: new Date(payload.timestamp),
    raw: normalizeSensorData(payload.raw),
    ml: payload.ml,
  }));
  const combinedLogs = [...logs, ...liveLogs].filter(
    (log, index, source) =>
      source.findIndex(
        (candidate) =>
          candidate.timestamp?.getTime?.() === log.timestamp?.getTime?.() &&
          candidate.raw?.tx_time === log.raw?.tx_time
      ) === index
  );
  const orderedLogs = combinedLogs
    .map((log) => ({ ...log, raw: normalizeSensorData(log.raw) }))
    .sort((a, b) => a.timestamp - b.timestamp);
  const gasValues = orderedLogs.map((log) => calculateGasPPM(Number(log.raw?.mq5_ao1 ?? 0)));
  const waterFlowValues = orderedLogs.map((log) => Number(log.raw.flow_rate));
  const waterLevelValues = orderedLogs.map((log) => Number(log.raw?.water_level ?? 0));
  const powerValues = orderedLogs.map((log) => (Number(log.raw?.ac_detected ?? 0) === 0 ? 100 : 0));
  const latestLog = orderedLogs[orderedLogs.length - 1];
  const latestRaw = liveData?.raw || latestLog?.raw || {};
  const latestComputed = liveData?.computed || {};
  const latestMl = liveData?.ml || latestLog?.ml || {};
  const mlProbability = Number(latestMl.confidence ?? latestMl.fault_probability ?? 0);
  const mlAnomaly = Boolean(latestMl.isAnomaly ?? latestMl.is_anomaly);
  const mlSeverity = String(latestMl.severity || "low").toLowerCase();

  const latestGas = Number(latestComputed.gas_ppm ?? gasValues[gasValues.length - 1] ?? 0);
  const latestWaterFlow = Number(latestRaw.flow_lpm ?? latestRaw.flow_rate ?? waterFlowValues[waterFlowValues.length - 1] ?? 0);
  const latestWaterLevel = Number(latestRaw.water_level ?? waterLevelValues[waterLevelValues.length - 1] ?? 0);
  const latestPower = Number(latestRaw.ac_detected ?? 1) === 0 ? 100 : 0;
  const gasStatus = latestComputed.gas_status ||
    (Number(latestRaw.mq5_do1 ?? 1) === 0 ||
    Number(latestRaw.mq5_do2 ?? 1) === 0 ||
    Number(latestRaw.mq5_ao1 ?? 0) >= 3200 ||
    Number(latestRaw.mq5_ao2 ?? 0) >= 3500
      ? "fault"
      : "normal");
  const waterStatus = latestComputed.water_status ||
    (latestWaterLevel === 0 || latestWaterFlow < 2
      ? "fault"
      : latestWaterFlow > 5
      ? "warning"
      : "normal");
  const acStatus = latestComputed.ac_status || (latestPower < 50 ? "fault" : "normal");

  const trendWindow = (values) => {
    if (values.length < 2) return 0;
    const first =
      values.slice(0, Math.min(3, values.length)).reduce((a, b) => a + b, 0) /
      Math.min(3, values.length);
    const last =
      values.slice(-Math.min(3, values.length)).reduce((a, b) => a + b, 0) /
      Math.min(3, values.length);
    return last - first;
  };

  const gasDelta = trendWindow(gasValues);
  const waterDelta = trendWindow(waterFlowValues);

  const sensorRisk = orderedLogs.length
    ? Math.min(
        100,
        Math.round(
          (latestGas / 1000) * 35 +
            (latestWaterFlow / 30) * 25 +
            (latestWaterLevel > 0 ? 20 : 15)
        )
      )
    : 0;
  const overallRisk = orderedLogs.length
    ? Math.min(100, Math.round(sensorRisk * 0.6 + mlProbability * 100 * 0.4))
    : 0;

  const labels = orderedLogs.slice(-12).map(
    (log) =>
      log.timestamp?.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) || "--:--"
  );

  const sparkOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.9)",
        titleColor: "#fff",
        bodyColor: "#fff",
        titleFont: { size: 10 },
        bodyFont: { size: 10 },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false, beginAtZero: false },
    },
    elements: {
      point: { radius: 0, hitRadius: 6 },
      line: { borderWidth: 2 },
    },
  };

  const evaluationRows = [
    {
      area: "ML Fault Detection",
      status: mlAnomaly ? "Anomaly" : "Clear",
      detail: latestLog
        ? `${mlSeverity.toUpperCase()} · ${(mlProbability * 100).toFixed(1)}% probability`
        : "No prediction available",
      severity:
        mlAnomaly || mlSeverity === "critical"
          ? "High"
          : mlSeverity === "medium"
          ? "Medium"
          : "Low",
    },
    {
      area: "Water Network",
      status:
        waterStatus === "fault"
          ? "Escalate"
          : waterStatus === "warning"
          ? "Monitor"
          : "Stable",
      detail:
        waterStatus === "fault"
          ? "Inspect intake lines and emergency shutoffs"
          : waterStatus === "warning"
          ? "Flow outside normal range — prepare inspection"
          : "Within control limits",
      severity: waterStatus === "fault" ? "High" : waterStatus === "warning" ? "Medium" : "Low",
    },
    {
      area: "Gas Monitoring",
      status: gasStatus === "fault" ? "Alert" : "Clear",
      detail:
        gasStatus === "fault"
          ? "Hazard conditions — isolate area immediately"
          : "Within safe range",
      severity: gasStatus === "fault" ? "High" : "Low",
    },
    {
      area: "Infrastructure",
      status: acStatus === "fault" ? "Backup" : "Stable",
      detail:
        acStatus === "fault"
          ? "Power unstable — activate backup systems"
          : "Power supply stable",
      severity: acStatus === "fault" ? "High" : "Low",
    },
  ];

  // Compact status ribbon items
  const statusItems = [
    {
      label: "Risk",
      value: `${overallRisk}%`,
      tag: overallRisk > 70 ? "Critical" : overallRisk > 45 ? "Elevated" : "Stable",
      tagColor: overallRisk > 70 ? "error" : overallRisk > 45 ? "warning" : "success",
      color: overallRisk > 70 ? "#d32f2f" : overallRisk > 45 ? "#ed6c02" : "#2e7d32",
    },
    {
      label: "Gas",
      value: `${latestGas.toFixed(0)} ppm`,
      tag: gasStatus === "fault" ? "Critical" : "Normal",
      tagColor: gasStatus === "fault" ? "error" : "success",
      color: gasStatus === "fault" ? "#d32f2f" : "#2e7d32",
      delta: gasDelta,
    },
    {
      label: "Water",
      value: `${latestWaterFlow.toFixed(1)} L/m`,
      tag: waterStatus === "fault" ? "High" : waterStatus === "warning" ? "Warn" : "OK",
      tagColor: waterStatus === "fault" ? "error" : waterStatus === "warning" ? "warning" : "success",
      color: waterStatus === "fault" ? "#d32f2f" : "#1976d2",
      delta: waterDelta,
    },
    {
      label: "Power",
      value: `${latestPower.toFixed(0)}%`,
      tag: latestPower < 50 ? "Risk" : "Stable",
      tagColor: latestPower < 50 ? "error" : "success",
      color: latestPower < 50 ? "#d32f2f" : "#2e7d32",
    },
  ];

  return (
    <>
      <GlobalHeader />
      <DashboardLayout>
        <MDBox py={2} pt={2}>
          {/* ── Header ── */}
          <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <MDBox>
              <MDBox display="flex" alignItems="center" gap={1}>
                <Icon sx={{ color: "#d32f2f", fontSize: 22 }}>emergency</Icon>
                <MDTypography variant="h5" fontWeight="bold">
                  Emergency Response Operations
                </MDTypography>
              </MDBox>
              <MDTypography variant="caption" color="text">
                Rapid disaster response team creation and field monitoring
              </MDTypography>
            </MDBox>
            <MDBox display="flex" alignItems="center" gap={1}>
              <Chip
                icon={<Icon sx={{ fontSize: "14px !important" }}>circle</Icon>}
                label={connected ? "LIVE" : "OFFLINE"}
                color={connected ? "success" : "error"}
                size="small"
                sx={{ fontWeight: 700, fontSize: "0.65rem", height: 22 }}
              />
            </MDBox>
          </MDBox>

          {/* ── Compact Status Ribbon ── */}
          <Card sx={{ px: 2, py: 1.2, mb: 2 }}>
            <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={2}>
              {statusItems.map((item) => (
                <MDBox key={item.label} display="flex" alignItems="center" gap={1} flex={1}>
                  <MDBox>
                    <MDTypography variant="caption" color="text" textTransform="uppercase" sx={{ fontSize: "0.6rem", letterSpacing: 0.5 }}>
                      {item.label}
                    </MDTypography>
                    <MDBox display="flex" alignItems="baseline" gap={0.5}>
                      <MDTypography variant="h6" fontWeight="bold" sx={{ color: item.color, fontSize: "1rem", lineHeight: 1.2 }}>
                        {item.value}
                      </MDTypography>
                      {item.delta !== undefined && (
                        <MDTypography variant="caption" sx={{ fontSize: "0.6rem", color: item.delta >= 0 ? "#d32f2f" : "#2e7d32" }}>
                          {item.delta >= 0 ? "▲" : "▼"}{Math.abs(item.delta).toFixed(1)}
                        </MDTypography>
                      )}
                    </MDBox>
                  </MDBox>
                  <Chip label={item.tag} color={item.tagColor} size="small" sx={{ fontSize: "0.55rem", height: 18, fontWeight: 700 }} />
                </MDBox>
              ))}
            </MDBox>
          </Card>

          {/* ── Field Metrics Strip ── */}
          <FieldTestMetrics logs={orderedLogs} mlAnomaly={mlAnomaly} overallRisk={overallRisk} />

          {logs.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2, py: 0, "& .MuiAlert-message": { fontSize: "0.8rem" } }}>
              No live telemetry available. Connect sensors or load a CSV to populate the dashboard.
            </Alert>
          )}

          {/* ── Main 2-Column Layout ── */}
          <Grid container spacing={2} mb={2}>
            {/* Left Column — Situation Overview */}
            <Grid item xs={12} md={7}>
              {/* Mini Trend Charts */}
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}>
                  <Card sx={{ p: 1.5 }}>
                    <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                      <MDTypography variant="caption" fontWeight="bold" sx={{ fontSize: "0.72rem" }}>
                        Water Flow
                      </MDTypography>
                      <MDTypography variant="caption" color="text" sx={{ fontSize: "0.6rem" }}>
                        Last 12 readings
                      </MDTypography>
                    </MDBox>
                    <MDBox sx={{ height: 100 }}>
                      <Line
                        data={{
                          labels,
                          datasets: [
                            {
                              data: waterFlowValues.slice(-12),
                              borderColor: "#2196F3",
                              backgroundColor: "rgba(33,150,243,0.08)",
                              fill: true,
                              tension: 0.4,
                            },
                          ],
                        }}
                        options={sparkOptions}
                      />
                    </MDBox>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ p: 1.5 }}>
                    <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                      <MDTypography variant="caption" fontWeight="bold" sx={{ fontSize: "0.72rem" }}>
                        Gas Concentration
                      </MDTypography>
                      <MDTypography variant="caption" color="text" sx={{ fontSize: "0.6rem" }}>
                        Last 12 readings
                      </MDTypography>
                    </MDBox>
                    <MDBox sx={{ height: 100 }}>
                      <Line
                        data={{
                          labels,
                          datasets: [
                            {
                              data: gasValues.slice(-12),
                              borderColor: "#9C27B0",
                              backgroundColor: "rgba(156,39,176,0.08)",
                              fill: true,
                              tension: 0.4,
                            },
                          ],
                        }}
                        options={sparkOptions}
                      />
                    </MDBox>
                  </Card>
                </Grid>
              </Grid>

              {/* Compact Evaluation Table */}
              <Card sx={{ p: 1.5 }}>
                <MDTypography variant="caption" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: "0.72rem" }} display="block" mb={1}>
                  Operational Assessment
                </MDTypography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, fontSize: "0.68rem", fontWeight: 700 }}>Area</TableCell>
                        <TableCell sx={{ py: 0.5, fontSize: "0.68rem", fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ py: 0.5, fontSize: "0.68rem", fontWeight: 700 }}>Assessment</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {evaluationRows.map((row) => (
                        <TableRow key={row.area}>
                          <TableCell sx={{ py: 0.6, fontSize: "0.72rem", fontWeight: 500 }}>{row.area}</TableCell>
                          <TableCell sx={{ py: 0.6 }}>
                            <Chip
                              label={row.status}
                              color={
                                row.severity === "High"
                                  ? "error"
                                  : row.severity === "Medium"
                                  ? "warning"
                                  : "success"
                              }
                              size="small"
                              sx={{ fontSize: "0.6rem", height: 20, fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 0.6, fontSize: "0.68rem", color: "#64748b" }}>{row.detail}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>

            {/* Right Column — Response Team Builder */}
            <Grid item xs={12} md={5}>
              <ResponseTeamBuilder
                overallRisk={overallRisk}
                mlAnomaly={mlAnomaly}
                mlSeverity={mlSeverity}
              />
            </Grid>
          </Grid>

          {/* ── CSV Playback (Collapsible) ── */}
          <Card sx={{ px: 2, py: 1, mb: 2 }}>
            <MDBox
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              onClick={() => setCsvExpanded(!csvExpanded)}
              sx={{ cursor: "pointer" }}
            >
              <MDBox display="flex" alignItems="center" gap={1}>
                <Icon sx={{ fontSize: 16, color: "#64748b" }}>play_circle</Icon>
                <MDTypography variant="caption" fontWeight="bold" textTransform="uppercase" sx={{ fontSize: "0.68rem" }}>
                  CSV Offline Demonstration
                </MDTypography>
              </MDBox>
              <IconButton size="small">
                <Icon sx={{ fontSize: 16 }}>{csvExpanded ? "expand_less" : "expand_more"}</Icon>
              </IconButton>
            </MDBox>
            <Collapse in={csvExpanded}>
              <MDBox mt={1}>
                <CsvPlaybackPanel />
              </MDBox>
            </Collapse>
          </Card>
        </MDBox>
      </DashboardLayout>
    </>
  );
}

export default ResponseTeamDashboard;
