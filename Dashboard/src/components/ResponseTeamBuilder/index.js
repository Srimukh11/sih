import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const DISPATCH_KEY = "faultEyeDispatches";
const AUDIT_KEY = "faultEyeResponseAudit";

const ROLE_COLORS = {
  "Team Lead": "#d32f2f",
  "Field Engineer": "#1976d2",
  "Safety Officer": "#ed6c02",
  "Medic": "#2e7d32",
  "Comms Officer": "#7b1fa2",
};

const PRESET_MEMBERS = [
  { name: "Ravi Kumar", role: "Team Lead", phone: "+91 98765 43210" },
  { name: "Priya Sharma", role: "Safety Officer", phone: "+91 98765 43211" },
  { name: "Arjun Patel", role: "Field Engineer", phone: "+91 98765 43212" },
  { name: "Dr. Meena", role: "Medic", phone: "+91 98765 43213" },
  { name: "Suresh Nair", role: "Comms Officer", phone: "+91 98765 43214" },
  { name: "Deepa Rao", role: "Field Engineer", phone: "+91 98765 43215" },
];

function ResponseTeamBuilder({ overallRisk, mlAnomaly, mlSeverity }) {
  const [reference, setReference] = useState(() => `INC-${Date.now().toString(36).toUpperCase().slice(-6)}`);
  const [priority, setPriority] = useState(overallRisk > 70 ? "Critical" : overallRisk > 45 ? "High" : "Medium");
  const [teamMembers, setTeamMembers] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [dispatchStatus, setDispatchStatus] = useState("pending");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Field Engineer");
  const [newPhone, setNewPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      setDispatches(JSON.parse(localStorage.getItem(DISPATCH_KEY) || "[]"));
    } catch {
      setDispatches([]);
    }
  }, []);

  const addPresetMember = (preset) => {
    if (teamMembers.find((m) => m.name === preset.name)) return;
    setTeamMembers((prev) => [...prev, { ...preset, id: Date.now() + Math.random() }]);
  };

  const addCustomMember = () => {
    if (!newName.trim()) return;
    setTeamMembers((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), name: newName.trim(), role: newRole, phone: newPhone.trim() || "N/A" },
    ]);
    setNewName("");
    setNewPhone("");
    setShowAddForm(false);
  };

  const removeMember = (id) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleDispatch = () => {
    if (teamMembers.length === 0) return;
    setDispatchStatus("dispatched");

    const dispatch = {
      id: Date.now(),
      reference,
      priority,
      notes,
      team: teamMembers,
      status: "dispatched",
      timestamp: new Date().toISOString(),
    };

    const nextDispatches = [dispatch, ...dispatches].slice(0, 10);
    setDispatches(nextDispatches);
    localStorage.setItem(DISPATCH_KEY, JSON.stringify(nextDispatches));

    const auditEntry = {
      id: Date.now(),
      action: `Dispatched ${teamMembers.length}-member team for ${reference} [${priority}]`,
      assignee: teamMembers.map((m) => m.name).join(", "),
      priority,
      reference,
      timestamp: new Date().toISOString(),
    };
    const prevAudit = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
    localStorage.setItem(AUDIT_KEY, JSON.stringify([auditEntry, ...prevAudit].slice(0, 20)));

    const backendHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const backendBaseUrl = `http://${backendHost}:8000`;
    fetch(`${backendBaseUrl}/api/incidents/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incident_id: reference,
        action: `Team dispatched: ${teamMembers.map((m) => `${m.name} (${m.role})`).join(", ")}`,
        assigned_unit: teamMembers[0]?.name || "Response Team",
        priority,
        team: teamMembers,
        notes,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Dispatch acknowledged:", data);
        window.dispatchEvent(new CustomEvent("incident-updated", { detail: data }));
      })
      .catch((err) => console.error("Dispatch error:", err));
  };

  const resetDispatch = () => {
    setTeamMembers([]);
    setDispatchStatus("pending");
    setNotes("");
    setReference(`INC-${Date.now().toString(36).toUpperCase().slice(-6)}`);
  };

  const statusColor = dispatchStatus === "dispatched" ? "success" : dispatchStatus === "on-site" ? "info" : "warning";
  const statusLabel = dispatchStatus === "dispatched" ? "✓ Dispatched" : dispatchStatus === "on-site" ? "● On-Site" : "◯ Pending";

  return (
    <MDBox>
      <Card sx={{ p: 2, mb: 2, border: mlAnomaly ? "1px solid #d32f2f" : "1px solid transparent" }}>
        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon sx={{ color: "#d32f2f", fontSize: 20 }}>emergency</Icon>
            <MDTypography variant="h6" fontWeight="bold" sx={{ fontSize: "0.95rem" }}>
              Rapid Team Dispatch
            </MDTypography>
          </MDBox>
          <Chip label={statusLabel} color={statusColor} size="small" sx={{ fontWeight: 700, fontSize: "0.7rem" }} />
        </MDBox>

        {mlAnomaly && (
          <Alert severity="error" sx={{ mb: 1.5, py: 0, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
            ML detected <strong>{mlSeverity}</strong> anomaly — immediate dispatch recommended
          </Alert>
        )}

        <Grid container spacing={1} mb={1.5}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              size="small"
              label="Incident ID"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              InputProps={{ sx: { fontSize: "0.8rem", height: 36 } }}
              InputLabelProps={{ sx: { fontSize: "0.8rem" } }}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.8rem" }}>Priority</InputLabel>
              <Select
                value={priority}
                label="Priority"
                onChange={(e) => setPriority(e.target.value)}
                sx={{ fontSize: "0.8rem", height: 36 }}
              >
                <MenuItem value="Critical">🔴 Critical</MenuItem>
                <MenuItem value="High">🟠 High</MenuItem>
                <MenuItem value="Medium">🟡 Medium</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <MDTypography variant="caption" color="text" fontWeight="medium" display="block" mb={0.5}>
          Quick add from roster:
        </MDTypography>
        <MDBox display="flex" flexWrap="wrap" gap={0.5} mb={1.5}>
          {PRESET_MEMBERS.map((preset) => {
            const isAdded = teamMembers.find((m) => m.name === preset.name);
            return (
              <Chip
                key={preset.name}
                label={`${preset.name.split(" ")[0]} · ${preset.role.split(" ")[0]}`}
                size="small"
                variant={isAdded ? "filled" : "outlined"}
                color={isAdded ? "success" : "default"}
                onClick={() => !isAdded && addPresetMember(preset)}
                sx={{
                  fontSize: "0.68rem",
                  height: 24,
                  cursor: isAdded ? "default" : "pointer",
                  opacity: isAdded ? 0.7 : 1,
                  "&:hover": { opacity: isAdded ? 0.7 : 0.85 },
                }}
              />
            );
          })}
        </MDBox>

        <MDBox display="flex" alignItems="center" gap={1} mb={1}>
          <Button
            size="small"
            variant="text"
            startIcon={<Icon sx={{ fontSize: "14px !important" }}>{showAddForm ? "remove" : "person_add"}</Icon>}
            onClick={() => setShowAddForm(!showAddForm)}
            sx={{ fontSize: "0.72rem", textTransform: "none", color: "#1976d2", p: 0, minWidth: 0 }}
          >
            {showAddForm ? "Cancel" : "Add custom member"}
          </Button>
        </MDBox>

        <Collapse in={showAddForm}>
          <Grid container spacing={1} mb={1.5}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                InputProps={{ sx: { fontSize: "0.75rem", height: 32 } }}
                InputLabelProps={{ sx: { fontSize: "0.75rem" } }}
              />
            </Grid>
            <Grid item xs={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: "0.75rem" }}>Role</InputLabel>
                <Select
                  value={newRole}
                  label="Role"
                  onChange={(e) => setNewRole(e.target.value)}
                  sx={{ fontSize: "0.75rem", height: 32 }}
                >
                  {Object.keys(ROLE_COLORS).map((role) => (
                    <MenuItem key={role} value={role} sx={{ fontSize: "0.8rem" }}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="Phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                InputProps={{ sx: { fontSize: "0.75rem", height: 32 } }}
                InputLabelProps={{ sx: { fontSize: "0.75rem" } }}
              />
            </Grid>
            <Grid item xs={2} display="flex" alignItems="center">
              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={addCustomMember}
                disabled={!newName.trim()}
                sx={{
                  fontSize: "0.7rem",
                  height: 32,
                  color: "#fff",
                  backgroundColor: "#0b4f71",
                  "&:hover": { backgroundColor: "#083b55" },
                  "&.Mui-disabled": { color: "#fff", backgroundColor: "#94a3b8" },
                }}
              >
                Add
              </Button>
            </Grid>
          </Grid>
        </Collapse>

        {teamMembers.length > 0 && (
          <MDBox mb={1.5}>
            <MDTypography variant="caption" color="text" fontWeight="medium" display="block" mb={0.5}>
              Dispatch team ({teamMembers.length} members):
            </MDTypography>
            <MDBox display="flex" flexDirection="column" gap={0.5}>
              {teamMembers.map((member) => (
                <MDBox
                  key={member.id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: 1,
                    py: 0.4,
                    borderRadius: 1,
                    backgroundColor: "rgba(15, 23, 42, 0.04)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                  }}
                >
                  <MDBox display="flex" alignItems="center" gap={1}>
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        bgcolor: ROLE_COLORS[member.role] || "#64748b",
                      }}
                    >
                      {member.name.charAt(0)}
                    </Avatar>
                    <MDBox>
                      <MDTypography variant="caption" fontWeight="bold" sx={{ fontSize: "0.72rem", lineHeight: 1.2 }}>
                        {member.name}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block" sx={{ fontSize: "0.65rem", lineHeight: 1.1 }}>
                        {member.role} · {member.phone}
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                  <IconButton size="small" onClick={() => removeMember(member.id)} sx={{ p: 0.25 }}>
                    <Icon sx={{ fontSize: "14px !important", color: "#94a3b8" }}>close</Icon>
                  </IconButton>
                </MDBox>
              ))}
            </MDBox>
          </MDBox>
        )}

        <TextField
          fullWidth
          size="small"
          label="Dispatch notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={1}
          maxRows={2}
          InputProps={{ sx: { fontSize: "0.75rem" } }}
          InputLabelProps={{ sx: { fontSize: "0.75rem" } }}
          sx={{ mb: 1.5 }}
        />

        <MDBox display="flex" gap={1}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleDispatch}
            disabled={teamMembers.length === 0 || dispatchStatus === "dispatched"}
            sx={{
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.8rem",
              py: 0.8,
              backgroundColor: teamMembers.length === 0 ? "#94a3b8" : "#d32f2f",
              "&:hover": { backgroundColor: "#b71c1c" },
              "&.Mui-disabled": { color: "#fff", backgroundColor: "#94a3b8" },
            }}
          >
            {dispatchStatus === "dispatched"
              ? `✓ Team Dispatched (${teamMembers.length})`
              : teamMembers.length === 0
              ? "Select team members"
              : `🚨 Dispatch ${teamMembers.length} Member${teamMembers.length > 1 ? "s" : ""}`}
          </Button>
          {dispatchStatus === "dispatched" && (
            <Button
              variant="outlined"
              size="small"
              onClick={resetDispatch}
              sx={{ fontSize: "0.72rem", textTransform: "none", minWidth: 90 }}
            >
              New Dispatch
            </Button>
          )}
        </MDBox>
      </Card>

      {dispatches.length > 0 && (
        <Card sx={{ p: 1.5 }}>
          <MDTypography variant="caption" fontWeight="bold" textTransform="uppercase" color="text" display="block" mb={0.5}>
            Recent Dispatches
          </MDTypography>
          {dispatches.slice(0, 3).map((d) => (
            <MDBox
              key={d.id}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                py: 0.5,
                borderBottom: "1px solid rgba(148,163,184,0.12)",
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <MDBox display="flex" alignItems="center" gap={0.5}>
                <Chip
                  label={d.priority}
                  size="small"
                  color={d.priority === "Critical" ? "error" : d.priority === "High" ? "warning" : "info"}
                  sx={{ fontSize: "0.6rem", height: 18 }}
                />
                <MDTypography variant="caption" fontWeight="medium" sx={{ fontSize: "0.7rem" }}>
                  {d.reference}
                </MDTypography>
                <MDTypography variant="caption" color="text" sx={{ fontSize: "0.65rem" }}>
                  · {d.team.length} members
                </MDTypography>
              </MDBox>
              <MDTypography variant="caption" color="text" sx={{ fontSize: "0.65rem" }}>
                {new Date(d.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </MDTypography>
            </MDBox>
          ))}
        </Card>
      )}
    </MDBox>
  );
}

ResponseTeamBuilder.propTypes = {
  overallRisk: PropTypes.number.isRequired,
  mlAnomaly: PropTypes.bool.isRequired,
  mlSeverity: PropTypes.string.isRequired,
};

export default ResponseTeamBuilder;
