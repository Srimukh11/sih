/* eslint-disable react/prop-types */
/* eslint-disable react/function-component-definition */
/**
=========================================================
* FaultEye Dashboard - Sensor Logs Table Data
=========================================================

* This file provides table structure for sensor logs
* Real data should be fetched from backend API
*/

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

export default function data() {
  return {
    columns: [
      { Header: "timestamp", accessor: "timestamp", width: "20%", align: "left" },
      { Header: "sensor", accessor: "sensor", align: "left" },
      { Header: "value", accessor: "value", align: "center" },
      { Header: "status", accessor: "status", align: "center" },
      { Header: "anomaly", accessor: "anomaly", align: "center" },
    ],

    rows: [
      {
        timestamp: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            2025-01-20 10:23:45
          </MDTypography>
        ),
        sensor: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Gas Sensor
          </MDTypography>
        ),
        value: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            1250
          </MDTypography>
        ),
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="normal" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        anomaly: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            No
          </MDTypography>
        ),
      },
      {
        timestamp: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            2025-01-20 10:23:47
          </MDTypography>
        ),
        sensor: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Water Flow
          </MDTypography>
        ),
        value: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            342 Hz
          </MDTypography>
        ),
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="normal" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        anomaly: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            No
          </MDTypography>
        ),
      },
      {
        timestamp: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            2025-01-20 10:23:49
          </MDTypography>
        ),
        sensor: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            AC Current
          </MDTypography>
        ),
        value: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            512 mA
          </MDTypography>
        ),
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="warning" color="warning" variant="gradient" size="sm" />
          </MDBox>
        ),
        anomaly: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Yes (78%)
          </MDTypography>
        ),
      },
    ],
  };
}
