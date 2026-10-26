/**
=========================================================
* FaultEye Dashboard - Real-time IoT Monitoring
=========================================================
*/

import React from "react";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";


// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Custom components
import PipelineCard from "components/PipelineCard";
import SensorChart from "components/SensorChart";
import GlobalHeader from "components/GlobalHeader";
import PipelineSidebar from "components/PipelineSidebar";

// WebSocket hook
import { useWebSocket } from "hooks/useWebSocket";

// Data transformer
import { transformSensorData } from "utils/sensorTransformers";

function Dashboard() {
  const { connected, data } = useWebSocket();


  // ✅ NEW: State to persist last valid data when connection drops
  const [lastValidData, setLastValidData] = React.useState(null);

  // Update last valid data when new data arrives
  React.useEffect(() => {
    if (data && connected) {
      setLastValidData(data);
    }
  }, [data, connected]);

  // Use last valid data as fallback when disconnected
  const currentData = connected && data ? data : lastValidData;
  const usingStaleData = !connected && lastValidData;

  // Log connection state for debugging
  console.log("🔍 Dashboard - WebSocket connected:", connected, "Data available:", !!currentData);

  // ✅ SIMPLIFIED OFFLINE DETECTION - Only check WebSocket connection
  // Data persists between updates, so we don't need to check health flags
  const systemOffline = !connected && !lastValidData;

  // Transform raw sensor data into calculated values (use data.raw if available)
  // Show last received data even if health flags indicate issues
  const transformed = currentData?.raw ? transformSensorData(currentData.raw) : null;

  // Default data structure if not connected
  const defaultData = {
    ml: { isAnomaly: false, severity: "low", confidence: 0 },
    ai_advice: "Waiting for connection...",
    lora: { rssi: 0, snr: 0, packets: 0, lossPct: 0 },
  };

  // Use the full payload data or default
  const live = {
    ml: currentData?.ml || defaultData.ml,
    ai: {
      summary: currentData?.ai_advice || defaultData.ai_advice,
      items: currentData?.ai_advice
        ? currentData.ai_advice.split("\n").filter((s) => s.trim())
        : [],
    },
    lora: currentData?.lora || defaultData.lora,
  };

  // Format last update timestamp
  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const lastUpdate = currentData?.timestamp ? formatLastUpdate(currentData.timestamp) : null;
  const sensorKeys = [
    "flow_lpm",
    "water_level",
    "mq5_ao1",
    "mq5_ao2",
    "mq5_do1",
    "mq5_do2",
    "ac_detected",
    "ldr_raw",
    "ldr_voltage",
  ];
  const missingSensorCount = currentData?.raw
    ? sensorKeys.filter((key) => currentData.raw[key] === undefined || currentData.raw[key] === null).length
    : sensorKeys.length;
  const dataQualityStatus = systemOffline ? "Offline" : missingSensorCount === 0 ? "Complete" : "Partial";

  return (
    <>
      {/* Global Header: Logo + PillNav + Status */}
      <GlobalHeader />

      {/* Main content - no left margin */}
      <DashboardLayout>
        <MDBox py={3} pt={3}>
          {/* ✅ NEW: Stale Data Warning - Show when using last received data */}
          {usingStaleData && (
            <MDBox mb={2}>
              <Card
                sx={{
                  backgroundColor: "#FFF3CD",
                  borderLeft: "4px solid #FFA000",
                  padding: 2,
                }}
              >
                <MDBox display="flex" alignItems="center" gap={1}>
                  <MDTypography variant="h6" fontWeight="bold" color="warning">
                    ⏱️ Using Last Received Data
                  </MDTypography>
                </MDBox>
                <MDTypography variant="caption" color="text">
                  Connection lost. Displaying last valid sensor data from {lastUpdate || "unknown"}
                </MDTypography>
              </Card>
            </MDBox>
          )}



          <Grid container spacing={3}>
            {/* Left Column: Pipeline Section */}
            <Grid item xs={12} lg={3}>
              <PipelineSidebar
                pipelineFaults={currentData?.pipeline_faults}
                connected={connected}
              />
            </Grid>

            {/* Right Column: Main Content */}
            <Grid item xs={12} lg={9}>
              {/* Row 1: Pipeline Cards */}
              <Grid container spacing={3}>
                {/* Water Line */}
                <Grid item xs={12} sm={12} md={6} lg={3} xl={3}>
                  <MDBox mb={1.5} sx={{ opacity: systemOffline ? 0.5 : 1 }}>
                    <PipelineCard
                      title={systemOffline ? "Water Line (Offline)" : "Water Line"}
                      value1Label="Flow Rate"
                      value1={systemOffline ? "—" : transformed ? transformed.water.flowLPM : "—"}
                      value1Unit={systemOffline ? "" : "L/min"}
                      value2Label="Water Level"
                      value2={
                        systemOffline
                          ? "—"
                          : transformed
                            ? transformed.water.waterLevelPercent
                            : "—"
                      }
                      value2Unit={systemOffline ? "" : "%"}
                      status={
                        systemOffline ? "offline" : transformed ? transformed.water.status : "fault"
                      }
                      icon="water_drop"
                      lastUpdate={lastUpdate}
                    />
                  </MDBox>
                </Grid>

                {/* Gas Line */}
                <Grid item xs={12} sm={12} md={6} lg={3} xl={3}>
                  <MDBox mb={1.5} sx={{ opacity: systemOffline ? 0.5 : 1 }}>
                    <PipelineCard
                      title={systemOffline ? "Gas Line (Offline)" : "Gas Line"}
                      value1Label="Gas PPM"
                      value1={systemOffline ? "—" : transformed ? transformed.gas.ppm : "—"}
                      value1Unit={systemOffline ? "" : "ppm"}
                      value2Label="Sensor ADC"
                      value2={systemOffline ? "—" : transformed ? transformed.gas.adc : "—"}
                      value2Unit=""
                      status={
                        systemOffline ? "offline" : transformed ? transformed.gas.status : "fault"
                      }
                      icon="cloud"
                      lastUpdate={lastUpdate}
                    />
                  </MDBox>
                </Grid>

                {/* Electricity Line */}
                <Grid item xs={12} sm={12} md={6} lg={3} xl={3}>
                  <MDBox mb={1.5} sx={{ opacity: systemOffline ? 0.5 : 1 }}>
                    <PipelineCard
                      title={systemOffline ? "Electricity Line (Offline)" : "Electricity Line"}
                      value1Label="Power Status"
                      value1={
                        systemOffline
                          ? "—"
                          : transformed
                            ? transformed.electricity.healthPercent
                            : "—"
                      }
                      value1Unit={systemOffline ? "" : "%"}
                      value2Label="AC Detection"
                      value2={
                        systemOffline
                          ? "—"
                          : transformed
                            ? transformed.electricity.present
                              ? "ON"
                              : "OFF"
                            : "—"
                      }
                      value2Unit=""
                      status={
                        systemOffline
                          ? "offline"
                          : transformed
                            ? transformed.electricity.status
                            : "fault"
                      }
                      icon="power"
                      lastUpdate={lastUpdate}
                    />
                  </MDBox>
                </Grid>

                {/* Data Cable */}
                <Grid item xs={12} sm={12} md={6} lg={3} xl={3}>
                  <MDBox mb={1.5} sx={{ opacity: systemOffline ? 0.5 : 1 }}>
                    <PipelineCard
                      title={systemOffline ? "Data Cable (Offline)" : "Data Cable"}
                      value1Label="Brightness"
                      value1={
                        systemOffline
                          ? "—"
                          : transformed
                            ? transformed.dataCable.brightnessPercent
                            : "—"
                      }
                      value1Unit={systemOffline ? "" : "%"}
                      value2Label="Voltage"
                      value2={
                        systemOffline ? "—" : transformed ? transformed.dataCable.voltage : "—"
                      }
                      value2Unit={systemOffline ? "" : "V"}
                      status={
                        systemOffline
                          ? "offline"
                          : transformed
                            ? transformed.dataCable.status
                            : "fault"
                      }
                      icon="wifi"
                      lastUpdate={lastUpdate}
                    />
                  </MDBox>
                </Grid>
              </Grid>

              <Card sx={{ mt: 2, mb: 1.5, opacity: systemOffline ? 0.65 : 1 }}>
                <MDBox p={2}>
                  <MDTypography variant="h6" fontWeight="medium" mb={2}>
                    Sensor Data Quality
                  </MDTypography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <MDTypography variant="caption" color="text" display="block">
                        Stream
                      </MDTypography>
                      <MDTypography variant="body2" fontWeight="bold" color={connected ? "success" : "error"}>
                        {connected ? "Live" : "Offline"}
                      </MDTypography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <MDTypography variant="caption" color="text" display="block">
                        Data quality
                      </MDTypography>
                      <MDTypography variant="body2" fontWeight="bold">
                        {dataQualityStatus}
                      </MDTypography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <MDTypography variant="caption" color="text" display="block">
                        Missing sensors
                      </MDTypography>
                      <MDTypography variant="body2" fontWeight="bold">
                        {missingSensorCount}/{sensorKeys.length}
                      </MDTypography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <MDTypography variant="caption" color="text" display="block">
                        Last update
                      </MDTypography>
                      <MDTypography variant="body2" fontWeight="bold">
                        {lastUpdate || "Waiting"}
                      </MDTypography>
                    </Grid>
                  </Grid>
                </MDBox>
              </Card>

              {/* Row 2: AI Recommendations (Left), ML + LoRa (Right) */}
              <MDBox mt={4.5}>
                <Grid container spacing={3}>
                  {/* AI Recommendations - Left side (larger) */}
                  <Grid item xs={12} md={12} lg={8}>
                    <Card sx={{ height: "100%", opacity: systemOffline ? 0.5 : 1 }}>
                      <MDBox pt={3} px={3}>
                        <MDTypography variant="h6" fontWeight="medium">
                          AI Recommendations
                        </MDTypography>
                        {!systemOffline && data?.ai_recommendations?.priority && (
                          <MDBadge
                            badgeContent={data.ai_recommendations.priority.toUpperCase()}
                            color={
                              data.ai_recommendations.priority === "critical"
                                ? "error"
                                : data.ai_recommendations.priority === "high"
                                  ? "warning"
                                  : data.ai_recommendations.priority === "medium"
                                    ? "info"
                                    : "success"
                            }
                            variant="gradient"
                            size="sm"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </MDBox>
                      <MDBox p={2}>
                        {systemOffline ? (
                          <>
                            <MDTypography variant="h6" color="text" fontWeight="medium" mb={2}>
                              Device Offline
                            </MDTypography>
                            <MDTypography variant="body2" color="text" fontWeight="regular">
                              No sensor data available. Please check device connections.
                            </MDTypography>
                          </>
                        ) : (
                          <>
                            {/* Overall Summary */}
                            <MDTypography variant="body2" color="text" fontWeight="regular">
                              {data?.ai_recommendations?.overall_summary || live.ai.summary}
                            </MDTypography>
                          </>
                        )}

                        {/* Safety Alert */}
                        {data?.ai_recommendations?.safety_alert && (
                          <MDBox
                            mt={2}
                            p={1.5}
                            sx={{
                              backgroundColor: "#ff1744",
                              borderRadius: "8px",
                              border: "2px solid #d50000",
                            }}
                          >
                            <MDTypography variant="caption" color="white" fontWeight="bold">
                              🚨 SAFETY ALERT - {data.ai_recommendations.estimated_response_time}
                            </MDTypography>
                          </MDBox>
                        )}

                        {!systemOffline && (
                          <>
                            {/* ✅ ENHANCED: AI Recommendations Per Pipeline - Bullet Point Format */}
                            <MDBox mt={2}>
                              {currentData?.pipeline_faults?.faulty_pipelines?.length > 0 ? (
                                currentData.pipeline_faults.faulty_pipelines.map(
                                  (pipeline, pIdx) => (
                                    <MDBox
                                      key={pIdx}
                                      mb={2}
                                      p={1.5}
                                      sx={{
                                        backgroundColor:
                                          pipeline.severity === "critical"
                                            ? "rgba(244, 67, 54, 0.08)"
                                            : "rgba(255, 152, 0, 0.08)",
                                        borderRadius: "8px",
                                        borderLeft:
                                          pipeline.severity === "critical"
                                            ? "4px solid #f44336"
                                            : "4px solid #ff9800",
                                      }}
                                    >
                                      {/* Pipeline Header */}
                                      <MDBox
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                      >
                                        <MDTypography
                                          variant="button"
                                          fontWeight="bold"
                                          color={
                                            pipeline.severity === "critical" ? "error" : "warning"
                                          }
                                        >
                                          {pipeline.pipeline_name}
                                        </MDTypography>
                                        <MDBadge
                                          badgeContent={`${pipeline.fault_count} fault${pipeline.fault_count > 1 ? "s" : ""
                                            }`}
                                          color={
                                            pipeline.severity === "critical" ? "error" : "warning"
                                          }
                                          size="xs"
                                        />
                                      </MDBox>

                                      {/* ✅ NEW: Bullet Point Recommendations */}
                                      <ul
                                        style={{
                                          margin: "8px 0 0 0",
                                          paddingLeft: "20px",
                                          listStyleType: "disc",
                                        }}
                                      >
                                        {pipeline.faulty_nodes.map((node, nIdx) => (
                                          <li key={nIdx}>
                                            <MDTypography
                                              variant="caption"
                                              color="text"
                                              component="span"
                                            >
                                              <strong>{node.node_id}:</strong> {node.issue}
                                            </MDTypography>
                                            <MDTypography
                                              variant="caption"
                                              color="text"
                                              component="div"
                                              sx={{ fontSize: "0.7rem", mt: 0.3 }}
                                            >
                                              → Current: {node.current_value} {node.unit} | Normal:{" "}
                                              {node.normal_value} {node.unit} (⚠️{" "}
                                              {node.deviation_percent}% deviation)
                                            </MDTypography>
                                          </li>
                                        ))}
                                      </ul>
                                    </MDBox>
                                  )
                                )
                              ) : (
                                <MDTypography variant="caption" color="text" component="div">
                                  ✅ All pipelines operational - No faults detected
                                </MDTypography>
                              )}
                            </MDBox>
                          </>
                        )}
                      </MDBox>
                    </Card>
                  </Grid>

                  {/* Right Column: ML Fault Detection (Top) + LoRa Communication (Bottom) */}
                  <Grid item xs={12} md={12} lg={4}>
                    <Grid container spacing={3}>
                      {/* ML Fault Detection - Top Right */}
                      <Grid item xs={12}>
                        <Card sx={{ height: "100%", opacity: systemOffline ? 0.5 : 1 }}>
                          <MDBox pt={3} px={3}>
                            <MDTypography variant="h6" fontWeight="medium">
                              ML Fault Detection
                            </MDTypography>
                          </MDBox>
                          <MDBox p={2}>
                            {systemOffline || !live.ml || live.ml.confidence === 0 ? (
                              <>
                                <MDBox
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <MDTypography variant="h4" fontWeight="bold" color="text">
                                    NO DATA
                                  </MDTypography>
                                  <MDBadge color="secondary" badgeContent="—" container />
                                </MDBox>
                                <MDTypography variant="caption" color="text">
                                  {systemOffline
                                    ? "System offline - No sensor data"
                                    : "Disconnected"}
                                </MDTypography>
                                <MDBox mt={2}>
                                  <MDTypography variant="button" color="text">
                                    Confidence: —
                                  </MDTypography>
                                </MDBox>
                                <MDBox mt={1}>
                                  <MDTypography variant="button" color="text">
                                    Severity: —
                                  </MDTypography>
                                </MDBox>
                              </>
                            ) : (
                              <>
                                <MDBox
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <MDTypography
                                    variant="h4"
                                    fontWeight="bold"
                                    color={live.ml.isAnomaly ? "error" : "success"}
                                  >
                                    {live.ml.isAnomaly ? "FAULT" : "NORMAL"}
                                  </MDTypography>
                                  <MDBadge
                                    color={live.ml.isAnomaly ? "error" : "success"}
                                    badgeContent={`${((live.ml.confidence || 0) * 100).toFixed(
                                      0
                                    )}%`}
                                    container
                                  />
                                </MDBox>
                                {/* ✅ ENHANCED: Show ML Model Information */}
                                <MDBox
                                  mt={1.5}
                                  p={1.5}
                                  sx={{
                                    backgroundColor: "rgba(0,0,0,0.02)",
                                    borderRadius: "8px",
                                  }}
                                >
                                  <MDTypography
                                    variant="caption"
                                    color="text"
                                    component="div"
                                    fontWeight="bold"
                                  >
                                    🤖 ML Model Details
                                  </MDTypography>
                                  <MDTypography variant="caption" color="text" component="div">
                                    Model: Isolation Forest (Hybrid)
                                  </MDTypography>
                                  <MDTypography variant="caption" color="text" component="div">
                                    Confidence: {((live.ml.confidence || 0) * 100).toFixed(1)}%
                                  </MDTypography>
                                  <MDTypography variant="caption" color="text" component="div">
                                    Severity: {(live.ml.severity || "low").toUpperCase()}
                                  </MDTypography>
                                  <MDTypography variant="caption" color="text" component="div">
                                    Prediction:{" "}
                                    {live.ml.isAnomaly ? "FAULT DETECTED" : "NORMAL OPERATION"}
                                  </MDTypography>
                                </MDBox>

                                {/* ✅ ENHANCED: Show detailed fault locations with distances */}
                                {currentData?.pipeline_faults?.faulty_pipelines?.length > 0 && (
                                  <MDBox mt={2}>
                                    <MDTypography variant="button" color="error" fontWeight="bold">
                                      ⚠️ {currentData.pipeline_faults.faulty_pipelines.length}{" "}
                                      Pipeline
                                      {currentData.pipeline_faults.faulty_pipelines.length > 1
                                        ? "s"
                                        : ""}{" "}
                                      Affected
                                    </MDTypography>

                                    {/* Show each pipeline with faulty nodes */}
                                    {currentData.pipeline_faults.faulty_pipelines.map(
                                      (pipeline, idx) => (
                                        <MDBox
                                          key={idx}
                                          mt={1.5}
                                          p={1}
                                          sx={{
                                            backgroundColor:
                                              pipeline.severity === "critical"
                                                ? "rgba(244, 67, 54, 0.08)"
                                                : "rgba(255, 152, 0, 0.08)",
                                            borderRadius: "6px",
                                            borderLeft:
                                              pipeline.severity === "critical"
                                                ? "3px solid #f44336"
                                                : "3px solid #ff9800",
                                          }}
                                        >
                                          <MDTypography
                                            variant="caption"
                                            fontWeight="bold"
                                            color={
                                              pipeline.severity === "critical" ? "error" : "warning"
                                            }
                                          >
                                            {pipeline.pipeline_name}
                                          </MDTypography>
                                          {/* List faulty nodes with distances */}
                                          <ul
                                            style={{
                                              margin: "4px 0 0 0",
                                              paddingLeft: "16px",
                                              listStyleType: "circle",
                                            }}
                                          >
                                            {pipeline.faulty_nodes?.map((node, nIdx) => (
                                              <li key={nIdx}>
                                                <MDTypography
                                                  variant="caption"
                                                  color="text"
                                                  sx={{ fontSize: "0.7rem" }}
                                                >
                                                  <strong>{node.node_id}</strong>
                                                  {node.distance_m &&
                                                    ` @ ${node.distance_m}m`} - {node.issue}
                                                </MDTypography>
                                              </li>
                                            ))}
                                          </ul>
                                        </MDBox>
                                      )
                                    )}
                                  </MDBox>
                                )}
                              </>
                            )}
                          </MDBox>
                        </Card>
                      </Grid>

                      {/* LoRa Communication - Bottom Right */}
                      <Grid item xs={12}>
                        <Card sx={{ height: "100%", opacity: systemOffline ? 0.6 : 1 }}>
                          <MDBox pt={3} px={3}>
                            <MDTypography variant="h6" fontWeight="medium">
                              LoRa Communication
                            </MDTypography>
                            <MDBox display="flex" alignItems="center" gap={1} mt={1}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor: systemOffline ? "#f44336" : "#4caf50",
                                }}
                              />
                              <MDTypography
                                variant="caption"
                                color={systemOffline ? "error" : "success"}
                              >
                                {systemOffline ? "Offline" : "Connected"}
                              </MDTypography>
                            </MDBox>
                          </MDBox>
                          <MDBox p={2}>
                            <MDBox display="flex" justifyContent="space-between">
                              <MDTypography variant="button" color="text">
                                RSSI:
                              </MDTypography>
                              <MDTypography variant="button" fontWeight="bold">
                                {systemOffline ? "—" : `${live.lora.rssi} dBm`}
                              </MDTypography>
                            </MDBox>
                            <MDBox display="flex" justifyContent="space-between">
                              <MDTypography variant="button" color="text">
                                SNR:
                              </MDTypography>
                              <MDTypography variant="button" fontWeight="bold">
                                {systemOffline ? "—" : live.lora.snr}
                              </MDTypography>
                            </MDBox>
                            <MDBox display="flex" justifyContent="space-between">
                              <MDTypography variant="button" color="text">
                                Packets:
                              </MDTypography>
                              <MDTypography variant="button" fontWeight="bold">
                                {systemOffline ? "—" : live.lora.packets}
                              </MDTypography>
                            </MDBox>
                            <MDBox display="flex" justifyContent="space-between">
                              <MDTypography variant="button" color="text">
                                Loss:
                              </MDTypography>
                              <MDTypography variant="button" fontWeight="bold">
                                {live.lora.lossPct}%
                              </MDTypography>
                            </MDBox>
                          </MDBox>
                        </Card>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </MDBox>

              {/* Row 3: Recent Sensor Trends - Multi-line Chart */}
              <MDBox mt={4.5}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <SensorChart
                      title="Recent Sensor Trends (Last 30 readings)"
                      labels={
                        data?.history
                          ? data.history.slice(-30).map((_, idx) => `T-${idx + 1}`)
                          : Array(30)
                            .fill(0)
                            .map((_, idx) => `T-${idx + 1}`)
                      }
                      datasets={[
                        {
                          label: "Water Flow (L/min)",
                          data: data?.history
                            ? data.history.slice(-30).map((h) => h.water?.flowLpm || 0)
                            : Array(30).fill(0),
                          color: "#1976d2",
                        },
                        {
                          label: "Gas (ppm)",
                          data: data?.history
                            ? data.history.slice(-30).map((h) => h.gas?.ppm || 0)
                            : Array(30).fill(0),
                          color: "#dc004e",
                        },
                        {
                          label: "Brightness (%)",
                          data: data?.history
                            ? data.history
                              .slice(-30)
                              .map((h) => h.dataCable?.brightnessPercent || 0)
                            : Array(30).fill(0),
                          color: "#f57c00",
                        },
                        {
                          label: "Water Level (%)",
                          data: data?.history
                            ? data.history.slice(-30).map((h) => h.water?.levelPct || 0)
                            : Array(30).fill(0),
                          color: "#388e3c",
                        },
                      ]}
                      height="350px"
                    />
                  </Grid>
                </Grid>
              </MDBox>

              {/* Row 4: Individual Pipeline Charts */}
              <MDBox mt={4.5}>
                <Grid container spacing={3}>
                  {/* Water Pipeline Chart */}
                  <Grid item xs={12} md={6}>
                    <SensorChart
                      title="Water Pipeline"
                      labels={
                        data?.history
                          ? data.history.slice(-20).map((_, idx) => `T-${idx + 1}`)
                          : Array(20)
                            .fill(0)
                            .map((_, idx) => `T-${idx + 1}`)
                      }
                      datasets={[
                        {
                          label: "Flow Rate (L/min)",
                          data: data?.history
                            ? data.history.slice(-20).map((h) => h.water?.flowLpm || 0)
                            : Array(20).fill(0),
                          color: "#1976d2",
                        },
                        {
                          label: "Level (%)",
                          data: data?.history
                            ? data.history.slice(-20).map((h) => h.water?.levelPct || 0)
                            : Array(20).fill(0),
                          color: "#388e3c",
                        },
                      ]}
                    />
                  </Grid>

                  {/* Gas Pipeline Chart */}
                  <Grid item xs={12} md={6}>
                    <SensorChart
                      title="Gas Pipeline (MQ-5 Sensor)"
                      labels={
                        data?.history
                          ? data.history.slice(-20).map((_, idx) => `T-${idx + 1}`)
                          : Array(20)
                            .fill(0)
                            .map((_, idx) => `T-${idx + 1}`)
                      }
                      datasets={[
                        {
                          label: "Gas Concentration (ppm)",
                          data: data?.history
                            ? data.history.slice(-20).map((h) => h.gas?.ppm || 0)
                            : Array(20).fill(0),
                          color: "#dc004e",
                        },
                      ]}
                    />
                  </Grid>

                  {/* Electricity Pipeline Chart */}
                  <Grid item xs={12} md={6}>
                    <SensorChart
                      title="Electricity Pipeline"
                      labels={
                        data?.history
                          ? data.history.slice(-20).map((_, idx) => `T-${idx + 1}`)
                          : Array(20)
                            .fill(0)
                            .map((_, idx) => `T-${idx + 1}`)
                      }
                      datasets={[
                        {
                          label: "Uptime (%)",
                          data: data?.history
                            ? data.history.slice(-20).map((h) => h.power?.uptimePct || 0)
                            : Array(20).fill(0),
                          color: "#388e3c",
                        },
                        {
                          label: "Status (0=OFF, 100=ON)",
                          data: data?.history
                            ? data.history.slice(-20).map((h) => (h.power?.online ? 100 : 0))
                            : Array(20).fill(0),
                          color: "#f57c00",
                        },
                      ]}
                    />
                  </Grid>

                  {/* Data Cable (LDR/Light Sensor) Chart */}
                  <Grid item xs={12} md={6}>
                    <SensorChart
                      title="Data Cable (Light/LDR Sensor)"
                      labels={
                        data?.history
                          ? data.history.slice(-20).map((_, idx) => `T-${idx + 1}`)
                          : Array(20)
                            .fill(0)
                            .map((_, idx) => `T-${idx + 1}`)
                      }
                      datasets={[
                        {
                          label: "Brightness (%)",
                          data: data?.history
                            ? data.history
                              .slice(-20)
                              .map((h) => h.dataCable?.brightnessPercent || 0)
                            : Array(20).fill(0),
                          color: "#f57c00",
                        },
                        {
                          label: "Voltage (V × 10)",
                          data: data?.history
                            ? data.history.slice(-20).map((h) => (h.dataCable?.voltage || 0) * 10)
                            : Array(20).fill(0),
                          color: "#1976d2",
                        },
                      ]}
                    />
                  </Grid>
                </Grid>
              </MDBox>
            </Grid>
          </Grid>
        </MDBox>
        <Footer />
      </DashboardLayout>
    </>
  );
}

export default Dashboard;
