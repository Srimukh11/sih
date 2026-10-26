/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";

// Global Header
import GlobalHeader from "components/GlobalHeader";

// WebSocket hook
import { useWebSocket } from "hooks/useWebSocket";

// Data
import deviceInfoData from "layouts/tables/data/projectsTableData";

function Tables() {
  const { connected, data } = useWebSocket();
  const { columns: pColumns, rows: pRows } = deviceInfoData();

  // Get history from WebSocket data
  const history = data?.history || [];

  // Transform history into table rows
  const sensorLogsColumns = [
    { Header: "timestamp", accessor: "timestamp", width: "15%", align: "left" },
    { Header: "sensor", accessor: "sensor", align: "left" },
    { Header: "value", accessor: "value", align: "center" },
    { Header: "status", accessor: "status", align: "center" },
    { Header: "anomaly", accessor: "anomaly", align: "center" },
  ];

  const sensorLogsRows = history.map((entry, index) => {
    const raw = entry.raw || {};
    const computed = entry.computed || {};
    const ml = entry.ml || {};
    const timestamp = new Date(entry.timestamp).toLocaleString();

    // Determine which sensor has the most significant change
    let sensorName = "Multi-Sensor";
    let valueDisplay = "N/A";
    let statusBadge = "normal";

    // Priority: Show fault conditions first
    if (computed.gas_status === "fault") {
      sensorName = "Gas Sensor";
      valueDisplay = `${raw.mq5_ao1 || 0} ADC`;
      statusBadge = "error";
    } else if (computed.water_status === "fault") {
      sensorName = "Water Flow";
      valueDisplay = `${raw.flow_lpm || 0} L/min`;
      statusBadge = "error";
    } else if (computed.ac_status === "fault") {
      sensorName = "AC Current";
      valueDisplay = raw.ac_detected === 0 ? "PRESENT" : "ABSENT";
      statusBadge = "error";
    } else if (computed.light_status === "warning" || computed.light_status === "fault") {
      sensorName = "LDR Light";
      valueDisplay = `${computed.brightness_pct?.toFixed(1) || 0}%`;
      statusBadge = computed.light_status === "fault" ? "error" : "warning";
    } else {
      // Show water flow for normal operation
      sensorName = "Water Flow";
      valueDisplay = `${raw.flow_lpm || 0} L/min`;
      statusBadge = "success";
    }

    return {
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {timestamp}
        </MDTypography>
      ),
      sensor: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {sensorName}
        </MDTypography>
      ),
      value: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {valueDisplay}
        </MDTypography>
      ),
      status: (
        <MDBox ml={-1}>
          <MDBadge
            badgeContent={
              statusBadge === "error" ? "FAULT" : statusBadge === "warning" ? "WARNING" : "NORMAL"
            }
            color={statusBadge}
            variant="gradient"
            size="sm"
          />
        </MDBox>
      ),
      anomaly: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          {ml.isAnomaly ? `Yes (${(ml.confidence * 100).toFixed(0)}%)` : "No"}
        </MDTypography>
      ),
    };
  });

  // Show "No data" message if not connected
  if (!connected || sensorLogsRows.length === 0) {
    sensorLogsRows.push({
      timestamp: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          --
        </MDTypography>
      ),
      sensor: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          Waiting for connection...
        </MDTypography>
      ),
      value: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          --
        </MDTypography>
      ),
      status: (
        <MDBox ml={-1}>
          <MDBadge badgeContent="NO DATA" color="dark" variant="gradient" size="sm" />
        </MDBox>
      ),
      anomaly: (
        <MDTypography variant="caption" color="text" fontWeight="medium">
          --
        </MDTypography>
      ),
    });
  }

  return (
    <>
      <GlobalHeader />
      <DashboardLayout>
        <MDBox pt={3} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white">
                  Sensor Logs (Last 20 Readings)
                </MDTypography>
              </MDBox>
              <MDBox pt={3}>
                <DataTable
                  table={{ columns: sensorLogsColumns, rows: sensorLogsRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white">
                  Device Information
                </MDTypography>
              </MDBox>
              <MDBox pt={3}>
                <DataTable
                  table={{ columns: pColumns, rows: pRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
    </>
  );
}

export default Tables;
