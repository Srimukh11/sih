/**
 * SensorLocations Component
 * Displays vertical pipeline timelines with animated node positions
 * Real-time RSSI-based distance estimation
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import PillNav from "components/PillNav";
import "../styles/pipeline.css";

// Status color mapping
const statusColors = {
  normal: "#66bb6a",
  fault: "#ef5350",
  offline: "#bdbdbd",
  absent: "#757575",
};

function SensorLocations() {
  const [pipelines, setPipelines] = useState([]);
  const [health, setHealth] = useState({
    tx_online: false,
    rx_online: false,
    mqtt_online: false,
    ws_online: false,
    backend_online: true,
  });
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const backendHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const backendBaseUrl = `http://${backendHost}:8000`;
    const backendWsUrl = `ws://${backendHost}:8000/api/ws/locations`;

    // Fetch initial pipeline data
    fetch(`${backendBaseUrl}/api/pipelines`)
      .then((res) => res.json())
      .then((data) => {
        setPipelines(data);
      })
      .catch((err) => console.error("Failed to fetch pipelines:", err));

    // Connect to WebSocket for real-time updates
    const ws = new WebSocket(backendWsUrl);

    ws.onopen = () => {
      console.log("📍 Connected to location tracking WebSocket");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setPipelines(data.pipelines || []);
        setHealth(data.health || health);
        setLastUpdate(new Date(data.ts));
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("📍 Disconnected from location tracking WebSocket");
    };

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, []);

  // Render vertical timeline for a single pipeline
  const renderPipeline = (pipeline) => {
    const maxDistance = Math.max(...pipeline.nodes.map((n) => n.fixed_distance_m)) || 200;

    return (
      <Card
        key={pipeline.pipeline_id}
        className="pipeline-card"
        sx={{
          padding: 3,
          minHeight: "600px",
          position: "relative",
        }}
      >
        {/* Pipeline Header */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <MDTypography variant="h5" fontWeight="bold">
            {pipeline.name}
          </MDTypography>
          <Chip
            label={`${pipeline.nodes.filter((n) => n.status === "normal").length}/${
              pipeline.nodes.length
            } Operational`}
            color={
              pipeline.nodes.every((n) => n.status === "normal" || n.status === "absent")
                ? "success"
                : "error"
            }
            size="small"
          />
        </MDBox>

        {/* Calibration Info */}
        <MDBox mb={2}>
          <MDTypography variant="caption" color="text">
            Path Loss Exponent: {pipeline.path_loss_n.toFixed(1)} | RSSI@1m:{" "}
            {pipeline.rssi_ref_dbm_at_1m.toFixed(0)} dBm
          </MDTypography>
        </MDBox>

        {/* Vertical Timeline */}
        <MDBox
          sx={{
            position: "relative",
            marginTop: 4,
            marginLeft: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {/* Animated connector line (SVG) */}
          <svg
            width="4"
            height={maxDistance * 3}
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: 0,
            }}
          >
            <line
              x1="2"
              y1="0"
              x2="2"
              y2={maxDistance * 3}
              className={`pipeline-connector ${
                pipeline.nodes.some((n) => n.status === "fault") ? "fault" : ""
              }`}
            />
          </svg>

          {/* Render nodes */}
          {pipeline.nodes.map((node, idx) => {
            const posY = node.fixed_distance_m * 3; // Scale factor for visualization

            return (
              <motion.div
                key={node.node_id}
                className="node-container"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                style={{
                  position: "absolute",
                  top: `${posY}px`,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                {/* Node circle */}
                <Tooltip
                  title={
                    <div>
                      <strong>{node.name}</strong>
                      <br />
                      Status: {node.status}
                      <br />
                      Fixed Distance: {node.fixed_distance_m}m
                      <br />
                      {node.distance_est_m && (
                        <>
                          Estimated Distance: {node.distance_est_m.toFixed(1)}m ±{" "}
                          {node.distance_uncertainty_m.toFixed(1)}m
                          <br />
                        </>
                      )}
                      {node.last_rssi && (
                        <>
                          RSSI: {node.last_rssi.toFixed(0)} dBm
                          <br />
                        </>
                      )}
                      {node.last_snr && (
                        <>
                          SNR: {node.last_snr.toFixed(1)} dB
                          <br />
                        </>
                      )}
                      Last Seen:{" "}
                      {node.last_seen ? new Date(node.last_seen).toLocaleTimeString() : "N/A"}
                    </div>
                  }
                  arrow
                  placement="right"
                >
                  <svg width="24" height="24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      className={`node-status ${node.status}`}
                      style={{
                        fill: statusColors[node.status] || "#bdbdbd",
                        stroke: "#fff",
                        strokeWidth: 2,
                        cursor: "pointer",
                      }}
                    />
                  </svg>
                </Tooltip>

                {/* Distance label */}
                <MDBox
                  className="distance-label"
                  sx={{
                    position: "absolute",
                    left: "32px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <MDTypography variant="caption" fontWeight="bold">
                    {node.fixed_distance_m}m
                  </MDTypography>
                  {node.distance_est_m && (
                    <MDTypography variant="caption" color="info" display="block">
                      ~{node.distance_est_m.toFixed(0)}m
                    </MDTypography>
                  )}
                </MDBox>

                {/* Node name (left side) */}
                <MDBox
                  sx={{
                    position: "absolute",
                    right: "32px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    textAlign: "right",
                  }}
                >
                  <MDTypography variant="caption" fontWeight="medium">
                    {node.name}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block" fontSize="0.7rem">
                    {node.sensor_type}
                  </MDTypography>
                </MDBox>
              </motion.div>
            );
          })}
        </MDBox>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        {/* System Health Alert */}
        {!health.tx_online && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ⚠️ Transmitter (TX) offline - No sensor data received
          </Alert>
        )}
        {!health.mqtt_online && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ MQTT connection lost - Check broker status
          </Alert>
        )}

        {/* Page Header */}
        <MDBox mb={3}>
          <MDTypography variant="h4" fontWeight="bold">
            📍 Sensor Location Tracking
          </MDTypography>
          <MDTypography variant="body2" color="text">
            Real-time RSSI-based distance estimation for underground utility monitoring
          </MDTypography>
          {lastUpdate && (
            <MDTypography variant="caption" color="info">
              Last Update: {lastUpdate.toLocaleTimeString()}
            </MDTypography>
          )}
        </MDBox>

        {/* Pipeline Grid */}
        <Grid container spacing={3}>
          {pipelines.map((pipeline) => (
            <Grid item xs={12} md={6} lg={3} key={pipeline.pipeline_id}>
              {renderPipeline(pipeline)}
            </Grid>
          ))}
        </Grid>

        {/* No data fallback */}
        {pipelines.length === 0 && (
          <Alert severity="info">
            No pipeline data available. Waiting for sensor transmissions...
          </Alert>
        )}
      </MDBox>

    </DashboardLayout>
  );
}

export default SensorLocations;
