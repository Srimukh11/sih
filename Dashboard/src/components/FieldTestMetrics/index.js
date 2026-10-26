import React from "react";
import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function FieldTestMetrics({ logs, mlAnomaly, overallRisk }) {
  const sampleCount = logs.length;
  const anomalyCount = logs.filter((log) => Boolean(log.ml?.isAnomaly ?? log.ml?.is_anomaly)).length;
  const anomalyRate = sampleCount ? (anomalyCount / sampleCount) * 100 : 0;
  const timestamps = logs.map((log) => new Date(log.timestamp).getTime()).filter(Number.isFinite);
  const intervals = timestamps.slice(1).map((value, index) => value - timestamps[index]).filter((value) => value >= 0);
  const averageInterval = intervals.length ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length / 1000 : 0;

  const items = [
    { label: "Samples", value: sampleCount },
    { label: "Anomaly Rate", value: `${anomalyRate.toFixed(1)}%` },
    { label: "Interval", value: averageInterval ? `${averageInterval.toFixed(1)}s` : "--" },
    { label: "Risk", value: `${overallRisk}%`, color: overallRisk > 70 ? "error" : overallRisk > 45 ? "warning" : "success" },
  ];

  return (
    <Card sx={{ px: 2, py: 1, mb: 2 }}>
      <MDBox display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <MDBox display="flex" alignItems="center" gap={0.5}>
          <MDTypography variant="caption" fontWeight="bold" textTransform="uppercase" color="text" sx={{ fontSize: "0.68rem" }}>
            Field Metrics
          </MDTypography>
          {mlAnomaly && (
            <Chip label="ML ALERT" color="error" size="small" sx={{ fontSize: "0.6rem", height: 18, fontWeight: 700 }} />
          )}
        </MDBox>
        <MDBox display="flex" alignItems="center" gap={2}>
          {items.map((item) => (
            <MDBox key={item.label} display="flex" alignItems="baseline" gap={0.5}>
              <MDTypography variant="caption" color="text" sx={{ fontSize: "0.65rem" }}>
                {item.label}:
              </MDTypography>
              <MDTypography
                variant="caption"
                fontWeight="bold"
                sx={{ fontSize: "0.75rem" }}
                color={item.color || "dark"}
              >
                {item.value}
              </MDTypography>
            </MDBox>
          ))}
        </MDBox>
      </MDBox>
    </Card>
  );
}

FieldTestMetrics.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.object).isRequired,
  mlAnomaly: PropTypes.bool.isRequired,
  overallRisk: PropTypes.number.isRequired,
};

export default FieldTestMetrics;

