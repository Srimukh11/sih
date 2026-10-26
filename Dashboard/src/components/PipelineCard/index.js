/**
 * Pipeline Status Cards - FaultEye Dashboard
 * Enhanced cards with dual values and status-based colors
 */
import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

function PipelineCard({
  title,
  value1Label,
  value1,
  value1Unit = "",
  value2Label,
  value2,
  value2Unit = "",
  status = "normal",
  statusMessage = "",
  icon = "speed",
  lastUpdate = null,
}) {
  // Map status to colors
  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case "normal":
        return { bg: "success", badge: "success" };
      case "warning":
        return { bg: "warning", badge: "warning" };
      case "fault":
        return { bg: "error", badge: "error" };
      case "offline":
        return { bg: "secondary", badge: "secondary" };
      default:
        return { bg: "info", badge: "info" };
    }
  };

  const colors = getStatusColor();

  return (
    <Card sx={{ height: "176px", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Status Icon at Top Right */}
      <MDBox
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1,
        }}
      >
        <Icon
          fontSize="small"
          sx={{
            color:
              status === "fault"
                ? "error.main"
                : status === "warning"
                ? "warning.main"
                : status === "offline"
                ? "text.secondary"
                : "success.main",
            fontSize: "1.25rem",
          }}
        >
          {status === "fault" || status === "warning"
            ? "error"
            : status === "offline"
            ? "signal_wifi_off"
            : "check_circle"}
        </Icon>
      </MDBox>

      <MDBox display="flex" justifyContent="space-between" pt={1} px={2}>
        <MDBox
          variant="gradient"
          bgColor={colors.bg}
          color="white"
          coloredShadow={colors.bg}
          borderRadius="xl"
          display="flex"
          justifyContent="center"
          alignItems="center"
          width="3.5rem"
          height="3.5rem"
          mt={-2}
        >
          <Icon fontSize="medium" color="inherit">
            {icon}
          </Icon>
        </MDBox>
        <MDBox textAlign="right" lineHeight={1} pr={3}>
          <MDTypography variant="button" fontWeight="light" color="text" fontSize="0.75rem">
            {title}
          </MDTypography>
        </MDBox>
      </MDBox>

      <MDBox px={2} pb={1} flex={1} display="flex" flexDirection="column" justifyContent="center">
        {/* Value 1 */}
        <MDBox mb={1}>
          <MDTypography variant="caption" color="text" fontWeight="regular" fontSize="0.65rem">
            {value1Label}
          </MDTypography>
          <MDTypography variant="h5" fontWeight="bold" display="flex" alignItems="baseline">
            {value1}
            {value1Unit && (
              <MDTypography
                variant="button"
                fontWeight="medium"
                color="text"
                ml={0.5}
                fontSize="0.75rem"
              >
                {value1Unit}
              </MDTypography>
            )}
          </MDTypography>
        </MDBox>

        {/* Value 2 */}
        {value2Label && (
          <MDBox mb={0.5}>
            <MDTypography variant="caption" color="text" fontWeight="regular" fontSize="0.65rem">
              {value2Label}
            </MDTypography>
            <MDTypography variant="h6" fontWeight="bold" display="flex" alignItems="baseline">
              {value2}
              {value2Unit && (
                <MDTypography
                  variant="button"
                  fontWeight="medium"
                  color="text"
                  ml={0.5}
                  fontSize="0.7rem"
                >
                  {value2Unit}
                </MDTypography>
              )}
            </MDTypography>
          </MDBox>
        )}

        {/* Last Updated Timestamp */}
        {lastUpdate && (
          <MDBox mt={0.5}>
            <MDTypography
              variant="caption"
              color="text"
              fontWeight="light"
              fontSize="0.6rem"
              sx={{ opacity: 0.7 }}
            >
              Updated: {lastUpdate}
            </MDTypography>
          </MDBox>
        )}
        {!lastUpdate && status === "offline" && (
          <MDBox mt={0.5}>
            <MDTypography
              variant="caption"
              color="text"
              fontWeight="light"
              fontSize="0.6rem"
              sx={{ opacity: 0.7 }}
            >
              Last updated: — (device offline)
            </MDTypography>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );
}

PipelineCard.propTypes = {
  title: PropTypes.string.isRequired,
  value1Label: PropTypes.string.isRequired,
  value1: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  value1Unit: PropTypes.string,
  value2Label: PropTypes.string,
  value2: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  value2Unit: PropTypes.string,
  status: PropTypes.oneOf(["normal", "warning", "fault", "offline"]),
  statusMessage: PropTypes.string,
  lastUpdate: PropTypes.string,
  icon: PropTypes.string,
};

export default PipelineCard;
