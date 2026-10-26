import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const AUDIT_KEY = "faultEyeResponseAudit";

function IncidentOperationsPanel({ overallRisk, mlAnomaly, mlSeverity }) {
  const [assignee, setAssignee] = useState("District Response Unit");
  const [priority, setPriority] = useState(overallRisk > 70 ? "Critical" : "High");
  const [reference, setReference] = useState("INC-");
  const [acknowledged, setAcknowledged] = useState(false);
  const [auditEntries, setAuditEntries] = useState([]);

  useEffect(() => {
    try {
      setAuditEntries(JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]"));
    } catch (error) {
      setAuditEntries([]);
    }
  }, []);

  const addAuditEntry = (action) => {
    const entry = {
      id: Date.now(),
      action,
      assignee,
      priority,
      reference: reference || "Unassigned incident",
      timestamp: new Date().toISOString(),
    };
    const nextEntries = [entry, ...auditEntries].slice(0, 20);
    setAuditEntries(nextEntries);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(nextEntries));
  };

  const handleAcknowledge = () => {
    const backendHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const backendBaseUrl = `http://${backendHost}:8000`;
    setAcknowledged(true);
    addAuditEntry(`Incident assigned to ${assignee} with ${priority} priority`);
    fetch(`${backendBaseUrl}/api/incidents/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incident_id: reference || "INC-OPS-01",
        action: "Incident acknowledged and unit dispatched",
        assigned_unit: assignee,
        priority,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Incident acknowledged in backend:", data);
        window.dispatchEvent(new CustomEvent("incident-updated", { detail: data }));
      })
      .catch((err) => console.error("Error acknowledging incident:", err));
  };

  return (
    <Grid container spacing={3} mb={3}>
      <Grid item xs={12} md={5}>
        <Card sx={{ p: 2, height: "100%" }}>
          <MDTypography variant="h6" fontWeight="bold" mb={2}>
            Incident Assignment and Acknowledgement
          </MDTypography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Incident reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select value={priority} label="Priority" onChange={(event) => setPriority(event.target.value)}>
                  <MenuItem value="Critical">Critical</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Assigned unit</InputLabel>
                <Select value={assignee} label="Assigned unit" onChange={(event) => setAssignee(event.target.value)}>
                  <MenuItem value="District Response Unit">District Response Unit</MenuItem>
                  <MenuItem value="Water Supply Division">Water Supply Division</MenuItem>
                  <MenuItem value="Gas Safety Division">Gas Safety Division</MenuItem>
                  <MenuItem value="Electrical Maintenance Division">Electrical Maintenance Division</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <MDBox display="flex" alignItems="center" justifyContent="space-between" mt={2}>
            <Chip label={acknowledged ? "Acknowledged" : "Pending acknowledgement"} color={acknowledged ? "success" : "warning"} size="small" />
            <Button
              variant="contained"
              size="small"
              onClick={handleAcknowledge}
              disabled={acknowledged}
              sx={{
                color: "#ffffff",
                backgroundColor: "#0b4f71",
                fontWeight: 700,
                "&:hover": { backgroundColor: "#083b55" },
                "&.Mui-disabled": { color: "#ffffff", backgroundColor: "#64748b" },
              }}
            >
              Acknowledge Incident
            </Button>
          </MDBox>
          {mlAnomaly && (
            <Alert severity="error" sx={{ mt: 2 }}>
              ML reports a {mlSeverity} anomaly. Confirm assignment before dispatch.
            </Alert>
          )}
        </Card>
      </Grid>

      <Grid item xs={12} md={7}>
        <Card sx={{ p: 2, height: "100%" }}>
          <MDTypography variant="h6" fontWeight="bold" mb={2}>
            Response History and Audit Records
          </MDTypography>
          {auditEntries.length === 0 ? (
            <MDTypography variant="body2" color="text">
              No response actions have been recorded for this session.
            </MDTypography>
          ) : (
            auditEntries.slice(0, 5).map((entry) => (
              <MDBox key={entry.id} display="flex" justifyContent="space-between" gap={2} mb={1}>
                <MDTypography variant="body2">{entry.action} - {entry.reference}</MDTypography>
                <MDTypography variant="caption" color="text" whiteSpace="nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </MDTypography>
              </MDBox>
            ))
          )}
        </Card>
      </Grid>
    </Grid>
  );
}

IncidentOperationsPanel.propTypes = {
  overallRisk: PropTypes.number.isRequired,
  mlAnomaly: PropTypes.bool.isRequired,
  mlSeverity: PropTypes.string.isRequired,
};

export default IncidentOperationsPanel;
