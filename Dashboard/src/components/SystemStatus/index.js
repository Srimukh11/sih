/**
 * SystemStatus Component
 * Global system status indicator for navbar
 */
import { Box, Typography, Tooltip } from "@mui/material";
import PropTypes from "prop-types";

function SystemStatus({ isOnline, lastUpdate }) {
  return (
    <Tooltip
      title={
        isOnline
          ? `Connected - Last update: ${lastUpdate || "Now"}`
          : "System offline - Check device connections"
      }
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1,
          borderRadius: 2,
          backgroundColor: isOnline ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)",
          border: `1px solid ${isOnline ? "#4caf50" : "#f44336"}`,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: isOnline ? "#4caf50" : "#f44336",
            animation: isOnline ? "pulse 2s infinite" : "none",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.5 },
            },
          }}
        />
        <Typography variant="caption" fontWeight="medium" color={isOnline ? "success.main" : "error.main"}>
          {isOnline ? "Connected" : "Offline"}
        </Typography>
      </Box>
    </Tooltip>
  );
}

SystemStatus.propTypes = {
  isOnline: PropTypes.bool.isRequired,
  lastUpdate: PropTypes.string,
};

export default SystemStatus;
