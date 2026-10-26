import React from "react";
import PropTypes from "prop-types";
import { Card, CardContent, Typography, Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "../../styles/pipeline.css";

export default function PipelinePreview({
  name,
  pipelineId,
  nodes,
  showFull = false,
  pipelineFaults,
  connected,
}) {
  const navigate = useNavigate();

  // Show only first 4-6 nodes in preview mode
  const displayNodes = showFull ? nodes : nodes.slice(0, 6);

  // Get node color based on fault detection (EXACT SAME LOGIC as PipelineSidebar)
  const getNodeColor = (nodeData) => {
    // Check if node has sensor attached (based on node naming convention)
    // Sensor nodes: "Water Node 1", "Water Node 3", "Gas Node 1", "Gas Node 2", "Power Node 1", "Fiber Node 1"
    const hasSensor =
      (pipelineId === "water_line" && (nodeData.node_id === 1 || nodeData.node_id === 3)) ||
      (pipelineId === "gas_line" && (nodeData.node_id === 1 || nodeData.node_id === 2)) ||
      (pipelineId === "power_line" && nodeData.node_id === 1) ||
      (pipelineId === "data_line" && nodeData.node_id === 1);

    // If node has no sensor attached, always gray (infrastructure node)
    if (!hasSensor) {
      return "#9CA3AF"; // Gray for non-sensor nodes
    }

    // If not connected, show gray (no sensor data)
    if (!connected || !pipelineFaults) {
      return "#9CA3AF"; // Gray
    }

    // Find the pipeline in fault data
    const pipelineType = pipelineId.split("_")[0]; // Extract 'water', 'gas', 'power', 'data'
    const faultyPipeline = pipelineFaults.faulty_pipelines?.find(
      (p) => p.pipeline_id === pipelineId || p.pipeline_name?.toLowerCase().includes(pipelineType)
    );

    if (!faultyPipeline) {
      // No faults for this pipeline = green (normal)
      return "#22C55E"; // Green
    }

    // Check if this specific sensor node has a fault
    const sensorTypes = {
      water_line: nodeData.node_id === 1 ? "flow_rate" : "water_level",
      gas_line: nodeData.node_id === 1 ? "mq5_ao1" : "mq5_ao2",
      power_line: "ac_detected",
      data_line: "ldr_raw",
    };

    const sensorType = sensorTypes[pipelineId];
    const hasFault = faultyPipeline.faulty_nodes?.some((node) => node.sensor_type === sensorType);

    return hasFault ? "#EF4444" : "#22C55E"; // Red (fault) or Green (normal)
  };

  const getUtilityIcon = (utilityType) => {
    const icons = {
      water: "💧",
      gas: "🔥",
      power: "⚡",
      data: "📡",
    };
    return icons[utilityType] || "📍";
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: 3,
        borderRadius: 2,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 6,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" fontWeight="bold">
            {getUtilityIcon(pipelineId.split("_")[0])} {name}
          </Typography>
        </Box>

        {/* Custom Timeline Implementation */}
        <Box sx={{ position: "relative", pl: 2 }}>
          {displayNodes.map((node, index) => (
            <Box
              key={node.node_id}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                position: "relative",
                mb: showFull ? 3 : 2.5,
              }}
            >
              {/* Animated Dotted Vertical Line (Connector) */}
              {index !== displayNodes.length - 1 && (
                <Box
                  sx={{
                    position: "absolute",
                    left: "7px",
                    top: "20px",
                    bottom: showFull ? "-24px" : "-20px",
                    width: "2px",
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 50%, transparent 50%)",
                    backgroundSize: "2px 8px",
                    animation: "moveDots 1s linear infinite",
                    "@keyframes moveDots": {
                      "0%": { backgroundPosition: "0 0" },
                      "100%": { backgroundPosition: "0 8px" },
                    },
                  }}
                />
              )}

              {/* Status Dot with Dynamic Color */}
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: getNodeColor(node),
                  boxShadow:
                    getNodeColor(node) === "#EF4444" ? "0 0 10px rgba(239, 68, 68, 0.5)" : "none",
                  animation: getNodeColor(node) === "#EF4444" ? "pulse 2s infinite" : "none",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                  },
                  flexShrink: 0,
                  zIndex: 1,
                  mr: 2,
                }}
              />

              {/* Node Content */}
              <Box sx={{ flex: 1, mt: -0.5 }}>
                <Typography variant="subtitle2" fontWeight="medium" fontSize="0.875rem">
                  {node.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                  📏 {node.distance_est_m?.toFixed(1) ?? "-"} m from TX
                </Typography>
                {showFull && (
                  <>
                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                      RSSI: {node.last_rssi} dBm | SNR: {node.last_snr} dB
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                      {node.last_seen ? new Date(node.last_seen).toLocaleString() : "No data"}
                    </Typography>
                  </>
                )}
                {!showFull && (
                  <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                    {node.last_seen ? new Date(node.last_seen).toLocaleTimeString() : "No data"}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {!showFull && nodes.length > displayNodes.length && (
          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            display="block"
            mt={1}
          >
            +{nodes.length - displayNodes.length} more nodes
          </Typography>
        )}
      </CardContent>

      {!showFull && (
        <Box sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="text"
            color="primary"
            onClick={() => navigate("/locations-new")}
            sx={{
              textTransform: "none",
              fontWeight: "medium",
              "&:hover": {
                backgroundColor: "rgba(25, 118, 210, 0.04)",
              },
            }}
          >
            See more →
          </Button>
        </Box>
      )}
    </Card>
  );
}

PipelinePreview.propTypes = {
  name: PropTypes.string.isRequired,
  pipelineId: PropTypes.string.isRequired,
  nodes: PropTypes.arrayOf(
    PropTypes.shape({
      node_id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.string,
      distance_est_m: PropTypes.number,
      last_rssi: PropTypes.number,
      last_snr: PropTypes.number,
      last_seen: PropTypes.string,
    })
  ).isRequired,
  showFull: PropTypes.bool,
  pipelineFaults: PropTypes.object,
  connected: PropTypes.bool,
};

PipelinePreview.defaultProps = {
  showFull: false,
  pipelineFaults: null,
  connected: false,
};
