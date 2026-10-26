/**
 * OfflineBanner Component
 * Displays system-wide offline status banner
 */
import { Box, Typography, Alert } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import PropTypes from "prop-types";

function OfflineBanner({ message, severity = "error", icon = true }) {
  return (
    <Alert
      severity={severity}
      icon={icon ? <ErrorOutlineIcon /> : false}
      sx={{
        mb: 3,
        borderRadius: 2,
        "& .MuiAlert-message": {
          width: "100%",
        },
      }}
    >
      <Typography variant="body2" fontWeight="medium">
        {message}
      </Typography>
    </Alert>
  );
}

OfflineBanner.propTypes = {
  message: PropTypes.string.isRequired,
  severity: PropTypes.oneOf(["error", "warning", "info", "success"]),
  icon: PropTypes.bool,
};

export default OfflineBanner;
