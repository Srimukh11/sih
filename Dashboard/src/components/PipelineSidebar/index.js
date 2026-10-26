import React, { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import "./pipeline.css";

const PIPELINE_COLORS = {
  water: "#2196F3", // Blue
  gas: "#9C27B0", // Purple
  power: "#009688", // Teal
  data: "#E91E63", // Pink
};

const PIPELINE_ICONS = {
  water: "💧",
  gas: "🔥",
  power: "⚡",
  data: "📡",
};

const PIPELINE_NAMES = {
  water: "Water Main",
  gas: "Gas Distribution",
  power: "Power Line",
  data: "Data Cable",
};

export default function PipelineSidebar({ pipelineFaults, connected }) {
  const navigate = useNavigate();

  // Define static pipeline structure - ALL 15 nodes per pipeline (60 total)
  // Only specific nodes have sensors connected (marked with hasSensor: true)
  // Gray nodes: No sensor attached | Red/Green nodes: Sensor-connected with fault detection
  const staticPipelines = [
    {
      pipeline_id: "water_line",
      type: "water",
      nodes: [
        { node_id: "Water Node 1", sensor: "flow_rate", hasSensor: true },
        { node_id: "Water Node 2", sensor: null, hasSensor: false },
        { node_id: "Water Node 3", sensor: "water_level", hasSensor: true },
        { node_id: "Water Node 4", sensor: null, hasSensor: false },
        { node_id: "Water Node 5", sensor: null, hasSensor: false },
        { node_id: "Water Node 6", sensor: null, hasSensor: false },
        { node_id: "Water Node 7", sensor: null, hasSensor: false },
        { node_id: "Water Node 8", sensor: null, hasSensor: false },
        { node_id: "Water Node 9", sensor: null, hasSensor: false },
        { node_id: "Water Node 10", sensor: null, hasSensor: false },
        { node_id: "Water Node 11", sensor: null, hasSensor: false },
        { node_id: "Water Node 12", sensor: null, hasSensor: false },
        { node_id: "Water Node 13", sensor: null, hasSensor: false },
        { node_id: "Water Node 14", sensor: null, hasSensor: false },
        { node_id: "Water Node 15", sensor: null, hasSensor: false },
      ],
    },
    {
      pipeline_id: "gas_line",
      type: "gas",
      nodes: [
        { node_id: "Gas Node 1", sensor: "mq5_ao1", hasSensor: true },
        { node_id: "Gas Node 2", sensor: "mq5_ao2", hasSensor: true },
        { node_id: "Gas Node 3", sensor: null, hasSensor: false },
        { node_id: "Gas Node 4", sensor: null, hasSensor: false },
        { node_id: "Gas Node 5", sensor: null, hasSensor: false },
        { node_id: "Gas Node 6", sensor: null, hasSensor: false },
        { node_id: "Gas Node 7", sensor: null, hasSensor: false },
        { node_id: "Gas Node 8", sensor: null, hasSensor: false },
        { node_id: "Gas Node 9", sensor: null, hasSensor: false },
        { node_id: "Gas Node 10", sensor: null, hasSensor: false },
        { node_id: "Gas Node 11", sensor: null, hasSensor: false },
        { node_id: "Gas Node 12", sensor: null, hasSensor: false },
        { node_id: "Gas Node 13", sensor: null, hasSensor: false },
        { node_id: "Gas Node 14", sensor: null, hasSensor: false },
        { node_id: "Gas Node 15", sensor: null, hasSensor: false },
      ],
    },
    {
      pipeline_id: "power_line",
      type: "power",
      nodes: [
        { node_id: "Power Node 1", sensor: "ac_detected", hasSensor: true },
        { node_id: "Power Node 2", sensor: null, hasSensor: false },
        { node_id: "Power Node 3", sensor: null, hasSensor: false },
        { node_id: "Power Node 4", sensor: null, hasSensor: false },
        { node_id: "Power Node 5", sensor: null, hasSensor: false },
        { node_id: "Power Node 6", sensor: null, hasSensor: false },
        { node_id: "Power Node 7", sensor: null, hasSensor: false },
        { node_id: "Power Node 8", sensor: null, hasSensor: false },
        { node_id: "Power Node 9", sensor: null, hasSensor: false },
        { node_id: "Power Node 10", sensor: null, hasSensor: false },
        { node_id: "Power Node 11", sensor: null, hasSensor: false },
        { node_id: "Power Node 12", sensor: null, hasSensor: false },
        { node_id: "Power Node 13", sensor: null, hasSensor: false },
        { node_id: "Power Node 14", sensor: null, hasSensor: false },
        { node_id: "Power Node 15", sensor: null, hasSensor: false },
      ],
    },
    {
      pipeline_id: "data_line",
      type: "data",
      nodes: [
        { node_id: "Fiber Node 1", sensor: "ldr_raw", hasSensor: true },
        { node_id: "Fiber Node 2", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 3", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 4", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 5", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 6", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 7", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 8", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 9", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 10", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 11", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 12", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 13", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 14", sensor: null, hasSensor: false },
        { node_id: "Fiber Node 15", sensor: null, hasSensor: false },
      ],
    },
  ];

  // Get node color based on real-time fault detection
  const getNodeColor = (pipelineType, nodeData) => {
    // If node has no sensor attached, always gray (infrastructure node)
    if (!nodeData.hasSensor) {
      return "#9CA3AF"; // Gray for non-sensor nodes
    }

    // If not connected, show gray (no sensor data)
    if (!connected || !pipelineFaults) {
      return "#9CA3AF"; // Gray
    }

    // Find the pipeline in fault data
    const faultyPipeline = pipelineFaults.faulty_pipelines?.find(
      (p) => p.pipeline_id === pipelineType || p.pipeline_name?.toLowerCase().includes(pipelineType)
    );

    if (!faultyPipeline) {
      // No faults for this pipeline = green (normal)
      return "#22C55E"; // Green
    }

    // Check if this specific sensor has a fault
    const hasFault = faultyPipeline.faulty_nodes?.some(
      (node) => node.sensor_type === nodeData.sensor
    );

    return hasFault ? "#EF4444" : "#22C55E"; // Red (fault) or Green (normal)
  };

  const getPipelineType = (pipelineId) => {
    return pipelineId.split("_")[0];
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100%",
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e0e0e0",
        p: 3,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Live Stream Status */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          color="success.main"
          display="flex"
          alignItems="center"
          gap={1}
        >
          🟢 Live data stream active - Updates every 5 seconds
        </Typography>
      </Box>

      {/* Legend */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Pipeline Legend
        </Typography>
        {/* Pipeline Color Coding */}
        {Object.entries(PIPELINE_COLORS).map(([type, color]) => (
          <Box key={type} display="flex" alignItems="center" gap={1} mb={0.5}>
            <Box
              sx={{
                width: 16,
                height: 3,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
            <Typography variant="caption" fontSize="0.75rem">
              {PIPELINE_ICONS[type]} {PIPELINE_NAMES[type]}
            </Typography>
          </Box>
        ))}

        {/* Node Status Legend */}
        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #e0e0e0" }}>
          <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
            Node Status:
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#22C55E" }} />
            <Typography variant="caption" fontSize="0.7rem">
              Normal
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#EF4444" }} />
            <Typography variant="caption" fontSize="0.7rem">
              Fault
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 4 Pipelines Side by Side */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flex: 1,
          justifyContent: "space-around",
        }}
      >
        {staticPipelines.map((pipeline) => {
          const type = pipeline.type;
          const pipelineColor = PIPELINE_COLORS[type] || "#757575";

          return (
            <Box
              key={pipeline.pipeline_id}
              sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              {/* Emoji at top */}
              <Typography variant="h4" sx={{ mb: 1 }}>
                {PIPELINE_ICONS[type]}
              </Typography>

              {/* Vertical Pipeline */}
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {pipeline.nodes.map((node, index) => {
                  const nodeColor = getNodeColor(type, node);

                  return (
                    <Box key={node.node_id} sx={{ position: "relative", mb: 7 }}>
                      {/* Animated Dotted Vertical Line */}
                      {index !== pipeline.nodes.length - 1 && (
                        <Box
                          className="animated-pipeline-line"
                          sx={{
                            position: "absolute",
                            left: "50%",
                            top: "14px",
                            height: "72px", // Adjusted distance between nodes
                            width: "3px",
                            color: pipelineColor,
                            transform: "translateX(-50%)",
                            zIndex: 0,
                          }}
                        />
                      )}

                      {/* Status Dot */}
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          backgroundColor: nodeColor,
                          border: `2px solid ${pipelineColor}`,
                          zIndex: 1,
                          position: "relative",
                          boxShadow: `0 0 8px ${nodeColor}40`,
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* See Details Link */}
      <Typography
        onClick={() => navigate("/locations")}
        sx={{
          textAlign: "center",
          color: "#1976d2",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: "pointer",
          "&:hover": {
            textDecoration: "underline",
          },
        }}
      >
        See Details →
      </Typography>
    </Box>
  );
}

PipelineSidebar.propTypes = {
  pipelineFaults: PropTypes.object,
  connected: PropTypes.bool,
};

PipelineSidebar.defaultProps = {
  pipelineFaults: null,
  connected: false,
};
