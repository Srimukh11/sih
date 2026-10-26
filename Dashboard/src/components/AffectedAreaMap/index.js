import React from "react";
import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function AffectedAreaMap({ overallRisk, mlAnomaly, latestGas, latestWaterFlow }) {
  const zones = [
    { name: "Zone A", label: "Gas monitoring", level: latestGas > 700 ? "High" : "Normal", left: "12%", top: "22%" },
    { name: "Zone B", label: "Water network", level: latestWaterFlow > 18 ? "High" : "Normal", left: "55%", top: "18%" },
    { name: "Zone C", label: "Response staging", level: mlAnomaly ? "Watch" : "Normal", left: "30%", top: "62%" },
    { name: "Zone D", label: "Critical services", level: overallRisk > 70 ? "High" : "Normal", left: "70%", top: "62%" },
  ];

  const zoneColor = (level) => (level === "High" ? "#b91c1c" : level === "Watch" ? "#b45309" : "#166534");

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      <MDTypography variant="h6" fontWeight="bold" mb={0.5}>
        Affected Area and Evacuation Planning Map
      </MDTypography>
      <MDTypography variant="body2" color="text" mb={2}>
        Schematic operational zones derived from current sensor and ML status. Confirm boundaries with field officers before public action.
      </MDTypography>
      <MDBox
        sx={{
          position: "relative",
          height: 300,
          overflow: "hidden",
          border: "1px solid #94a3b8",
          backgroundColor: "#eef4f7",
          backgroundImage: "linear-gradient(#d5e1e7 1px, transparent 1px), linear-gradient(90deg, #d5e1e7 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <MDBox sx={{ position: "absolute", left: "8%", right: "8%", top: "48%", borderTop: "3px solid #64748b" }} />
        <MDBox sx={{ position: "absolute", top: "8%", bottom: "8%", left: "48%", borderLeft: "3px solid #64748b" }} />
        {zones.map((zone) => (
          <MDBox key={zone.name} sx={{ position: "absolute", left: zone.left, top: zone.top, transform: "translate(-50%, -50%)" }}>
            <MDBox sx={{ width: 96, height: 64, p: 1, border: `3px solid ${zoneColor(zone.level)}`, backgroundColor: "rgba(255,255,255,0.9)", boxShadow: "0 2px 8px rgba(15,23,42,0.14)" }}>
              <MDTypography variant="caption" fontWeight="bold" display="block">{zone.name}</MDTypography>
              <MDTypography variant="caption" display="block">{zone.label}</MDTypography>
              <Chip label={zone.level} size="small" sx={{ height: 18, fontSize: 10, color: "#fff", backgroundColor: zoneColor(zone.level) }} />
            </MDBox>
          </MDBox>
        ))}
      </MDBox>
      <Grid container spacing={2} mt={1}>
        <Grid item xs={12} sm={4}><MDTypography variant="caption">Red: priority assessment</MDTypography></Grid>
        <Grid item xs={12} sm={4}><MDTypography variant="caption">Amber: field verification required</MDTypography></Grid>
        <Grid item xs={12} sm={4}><MDTypography variant="caption">Green: normal monitoring zone</MDTypography></Grid>
      </Grid>
    </Card>
  );
}

AffectedAreaMap.propTypes = {
  overallRisk: PropTypes.number.isRequired,
  mlAnomaly: PropTypes.bool.isRequired,
  latestGas: PropTypes.number.isRequired,
  latestWaterFlow: PropTypes.number.isRequired,
};

export default AffectedAreaMap;
