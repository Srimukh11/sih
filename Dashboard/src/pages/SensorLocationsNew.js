/**
 * Asset Health Component - Full Utility Pipeline & Node Inspector View
 * Real-time monitoring of Gas, Water, Electricity, and Fiber pipelines
 * RSSI-based distance estimation and ML fault localization
 */

import React, { useState, useEffect } from "react";
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import Footer from "examples/Footer";
import GlobalHeader from "components/GlobalHeader";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";

function SensorLocationsNew() {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [pipelineFaults, setPipelineFaults] = useState(null);
  const [liveSensors, setLiveSensors] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState("all");

  useEffect(() => {
    const backendHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const backendBaseUrl = `http://${backendHost}:8000`;
    const backendWsUrl = `ws://${backendHost}:8000/ws/sensordata`;

    const fetchPipelines = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/api/pipelines`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        setPipelines(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching pipelines:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPipelines();

    // Fetch initial live telemetry
    fetch(`${backendBaseUrl}/api/live`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.live_data) {
          setLiveSensors(data.live_data);
        }
      })
      .catch((err) => console.error("Error fetching live data:", err));

    // Connect to WebSocket for real-time fault detection and node telemetry
    const ws = new WebSocket(backendWsUrl);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);

        if (update.pipeline_faults) {
          setPipelineFaults(update.pipeline_faults);
        }

        if (update.raw) {
          setLiveSensors(update.raw);
        }

        if (update.type === "location_update" && update.node_updates) {
          setPipelines((prevPipelines) =>
            prevPipelines.map((pipeline) => {
              const updatedNodes = pipeline.nodes.map((node) => {
                const nodeUpdate = update.node_updates.find(
                  (u) => u.pipeline_id === pipeline.pipeline_id && u.node_id === node.node_id
                );
                return nodeUpdate ? { ...node, ...nodeUpdate } : node;
              });
              return { ...pipeline, nodes: updatedNodes };
            })
          );
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    ws.onerror = () => setWsConnected(false);
    ws.onclose = () => setWsConnected(false);

    return () => ws.close();
  }, []);

  const getPipelineHealth = (pipelineId) => {
    const pType = pipelineId.split("_")[0];
    const isFaulty = pipelineFaults?.faulty_pipelines?.some(
      (p) => p.pipeline_id === pipelineId || p.pipeline_name?.toLowerCase().includes(pType)
    );

    if (isFaulty) {
      return { status: "Fault Detected", score: 45, color: "error" };
    }
    return { status: "Healthy", score: 98, color: "success" };
  };

  const getNodeStatus = (pipelineId, node) => {
    const hasSensor =
      (pipelineId === "water_line" && (node.node_id === 1 || node.node_id === 3)) ||
      (pipelineId === "gas_line" && (node.node_id === 1 || node.node_id === 2)) ||
      (pipelineId === "power_line" && node.node_id === 1) ||
      (pipelineId === "data_line" && node.node_id === 1);

    if (!hasSensor) {
      return { status: "Infrastructure Node", color: "#64748B", isSensor: false, hasFault: false };
    }

    const pType = pipelineId.split("_")[0];
    const faultyP = pipelineFaults?.faulty_pipelines?.find(
      (p) => p.pipeline_id === pipelineId || p.pipeline_name?.toLowerCase().includes(pType)
    );

    if (!faultyP) {
      return { status: "Operational", color: "#22C55E", isSensor: true, hasFault: false };
    }

    const sensorTypes = {
      water_line: node.node_id === 1 ? "flow_rate" : "water_level",
      gas_line: node.node_id === 1 ? "mq5_ao1" : "mq5_ao2",
      power_line: "ac_detected",
      data_line: "ldr_raw",
    };

    const sType = sensorTypes[pipelineId];
    const fault = faultyP.faulty_nodes?.some((n) => n.sensor_type === sType);

    return {
      status: fault ? "Fault Active" : "Operational",
      color: fault ? "#EF4444" : "#22C55E",
      isSensor: true,
      hasFault: Boolean(fault),
    };
  };

  const filteredPipelines =
    selectedPipelineId === "all"
      ? pipelines
      : pipelines.filter((p) => p.pipeline_id === selectedPipelineId);

  return (
    <>
      <GlobalHeader />
      <DashboardLayout>
        <MDBox py={3} pt={3}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              🏥 Asset Health & Underground Utility Map
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time structural integrity, sensor telemetry, and fault localization along 4 critical utility pipelines.
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mt={1.5}>
              <Chip
                icon={wsConnected ? <CheckCircleIcon /> : <WarningIcon />}
                label={wsConnected ? "Telemetry Stream Live" : "Connecting to Stream..."}
                color={wsConnected ? "success" : "warning"}
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                📏 Distance model: Log-Distance Path Loss (LDPL) d = d₀ × 10^((RSSI_ref - RSSI)/(10n))
              </Typography>
            </Box>
          </Box>

          {/* Quick Filter Buttons */}
          <Box display="flex" gap={1} mb={3} flexWrap="wrap">
            <Button
              variant={selectedPipelineId === "all" ? "contained" : "outlined"}
              size="small"
              onClick={() => setSelectedPipelineId("all")}
              sx={{ color: selectedPipelineId === "all" ? "#fff" : "inherit" }}
            >
              All Utilities ({pipelines.length})
            </Button>
            {pipelines.map((p) => (
              <Button
                key={p.pipeline_id}
                variant={selectedPipelineId === p.pipeline_id ? "contained" : "outlined"}
                size="small"
                onClick={() => setSelectedPipelineId(p.pipeline_id)}
                sx={{ color: selectedPipelineId === p.pipeline_id ? "#fff" : "inherit" }}
              >
                {p.name}
              </Button>
            ))}
          </Box>

          {/* Pipeline Health Overview Summary Cards */}
          <Grid container spacing={2.5} mb={3}>
            {pipelines.map((pipeline) => {
              const health = getPipelineHealth(pipeline.pipeline_id);
              const nodeCount = pipeline.nodes?.length || 15;
              return (
                <Grid item xs={12} sm={6} md={3} key={pipeline.pipeline_id}>
                  <Card sx={{ p: 2, height: "100%", borderLeft: `4px solid ${health.color === "error" ? "#EF4444" : "#22C55E"}` }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <MDTypography variant="button" fontWeight="bold" textTransform="uppercase">
                        {pipeline.name}
                      </MDTypography>
                      <Chip label={health.status} color={health.color} size="small" />
                    </Box>
                    <Box mt={1.5} display="flex" alignItems="baseline" gap={1}>
                      <MDTypography variant="h3" fontWeight="bold" color={health.color}>
                        {health.score}%
                      </MDTypography>
                      <Typography variant="caption" color="text.secondary">
                        Structural Health
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      {nodeCount} Sensor Nodes • Segment Length: 150m
                    </Typography>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Node Inspector Drawer/Panel if a node is selected */}
          {selectedNode && (
            <Card sx={{ mb: 3, p: 2.5, backgroundColor: "#F8FAFC", border: "1px solid #CBD5E1" }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <RadioButtonCheckedIcon sx={{ color: selectedNode.statusInfo.color }} />
                  <Typography variant="h6" fontWeight="bold">
                    Node Inspector: {selectedNode.node_name || `Node ${selectedNode.node_id}`} ({selectedNode.pipelineName})
                  </Typography>
                </Box>
                <Button size="small" variant="text" onClick={() => setSelectedNode(null)}>
                  Close
                </Button>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Physical Distance:</Typography>
                  <Typography variant="body2" fontWeight="bold">{selectedNode.distance_m || (selectedNode.node_id * 10)} meters</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Estimated RSSI / Signal:</Typography>
                  <Typography variant="body2" fontWeight="bold">{selectedNode.rssi || -95} dBm</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">Node Status:</Typography>
                  <Chip label={selectedNode.statusInfo.status} size="small" sx={{ backgroundColor: selectedNode.statusInfo.color, color: "#fff", fontWeight: "bold" }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="caption" color="text.secondary">ML Diagnostic:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedNode.statusInfo.hasFault ? "⚠️ Anomaly flagged by ML model. Deploy inspection unit." : "✅ Normal operation along pipe segment."}
                  </Typography>
                </Grid>
              </Grid>
            </Card>
          )}

          {/* Pipelines Grid */}
          {loading ? (
            <Card sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body1">Loading pipeline telemetry & assets...</Typography>
            </Card>
          ) : error ? (
            <Alert severity="error">Error loading pipeline assets: {error}</Alert>
          ) : (
            <Grid container spacing={3}>
              {filteredPipelines.map((pipeline) => (
                <Grid item xs={12} md={6} key={pipeline.pipeline_id}>
                  <Card sx={{ p: 2.5, height: "100%" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight="bold">
                        {pipeline.name}
                      </Typography>
                      <Chip
                        label={`${pipeline.nodes?.length || 15} Nodes`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {/* Timeline Node Sequence */}
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {(pipeline.nodes || []).map((node) => {
                        const statusInfo = getNodeStatus(pipeline.pipeline_id, node);
                        const isSelected = selectedNode?.node_id === node.node_id && selectedNode?.pipelineId === pipeline.pipeline_id;
                        return (
                          <Box
                            key={node.node_id}
                            onClick={() => setSelectedNode({ ...node, pipelineId: pipeline.pipeline_id, pipelineName: pipeline.name, statusInfo })}
                            sx={{
                              p: 1,
                              borderRadius: 1.5,
                              minWidth: 70,
                              textAlign: "center",
                              cursor: "pointer",
                              border: isSelected ? "2px solid #1E293B" : "1px solid #E2E8F0",
                              backgroundColor: isSelected ? "#EEF2F6" : "rgba(241, 245, 249, 0.6)",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                transform: "scale(1.05)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: statusInfo.color,
                                margin: "0 auto 4px auto",
                              }}
                            />
                            <Typography variant="caption" fontWeight="bold" display="block">
                              N{node.node_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                              {node.distance_m || node.node_id * 10}m
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>

                    <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Click any node to inspect sensor metrics & localization.
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </MDBox>
        <Footer />
      </DashboardLayout>
    </>
  );
}

export default SensorLocationsNew;
