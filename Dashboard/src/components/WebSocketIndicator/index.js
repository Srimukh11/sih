/**
 * WebSocket Connection Indicator
 * Small animated dot showing real-time connection status
 */
import { keyframes } from "@mui/system";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import PropTypes from "prop-types";

// Pulse animation for connected state
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

function WebSocketIndicator({ connected }) {
  return (
    <MDBox display="flex" alignItems="center" gap={1}>
      <MDBox
        sx={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: connected ? "#4CAF50" : "#F44336",
          animation: connected ? `${pulse} 2s ease-in-out infinite` : "none",
          boxShadow: connected
            ? "0 0 8px rgba(76, 175, 80, 0.6)"
            : "0 0 8px rgba(244, 67, 54, 0.6)",
        }}
      />
      <MDTypography variant="caption" color="text" fontWeight="medium">
        {connected ? "Connected" : "Disconnected"}
      </MDTypography>
    </MDBox>
  );
}

WebSocketIndicator.propTypes = {
  connected: PropTypes.bool.isRequired,
};

export default WebSocketIndicator;
