/* eslint-disable react/prop-types */
/* eslint-disable react/function-component-definition */
/**
=========================================================
* FaultEye Dashboard - Device Info Table Data
=========================================================

* This file provides table structure for ESP32 device information
* Real data should be fetched from backend API
*/

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDBadge from "components/MDBadge";

export default function data() {
  return {
    columns: [
      { Header: "device", accessor: "device", width: "30%", align: "left" },
      { Header: "type", accessor: "type", width: "20%", align: "left" },
      { Header: "status", accessor: "status", align: "center" },
      { Header: "last seen", accessor: "lastseen", align: "center" },
    ],

    rows: [
      {
        device: (
          <MDBox display="flex" alignItems="center" lineHeight={1}>
            <MDBox ml={2} lineHeight={1}>
              <MDTypography display="block" variant="button" fontWeight="medium">
                ESP32 Transmitter
              </MDTypography>
              <MDTypography variant="caption">865 MHz LoRa TX</MDTypography>
            </MDBox>
          </MDBox>
        ),
        type: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Sensor Node
          </MDTypography>
        ),
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="online" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        lastseen: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            2025-01-20 10:24:01
          </MDTypography>
        ),
      },
      {
        device: (
          <MDBox display="flex" alignItems="center" lineHeight={1}>
            <MDBox ml={2} lineHeight={1}>
              <MDTypography display="block" variant="button" fontWeight="medium">
                ESP32 Receiver
              </MDTypography>
              <MDTypography variant="caption">865 MHz LoRa RX + WiFi</MDTypography>
            </MDBox>
          </MDBox>
        ),
        type: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Gateway Node
          </MDTypography>
        ),
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="online" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        lastseen: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            2025-01-20 10:24:02
          </MDTypography>
        ),
      },
      {
        device: (
          <MDBox display="flex" alignItems="center" lineHeight={1}>
            <MDBox ml={2} lineHeight={1}>
              <MDTypography display="block" variant="button" fontWeight="medium">
                MQTT Broker
              </MDTypography>
              <MDTypography variant="caption">Mosquitto localhost:1883</MDTypography>
            </MDBox>
          </MDBox>
        ),
        type: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Message Broker
          </MDTypography>
        ),
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="online" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        lastseen: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Active
          </MDTypography>
        ),
      },
      {
        device: (
          <MDBox display="flex" alignItems="center" lineHeight={1}>
            <MDBox ml={2} lineHeight={1}>
              <MDTypography display="block" variant="button" fontWeight="medium">
                Backend Server
              </MDTypography>
              <MDTypography variant="caption">FastAPI + ML + AI</MDTypography>
            </MDBox>
          </MDBox>
        ),
        type: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Processing Server
          </MDTypography>
        ),
        status: (
          <MDBox ml={-1}>
            <MDBadge badgeContent="online" color="success" variant="gradient" size="sm" />
          </MDBox>
        ),
        lastseen: (
          <MDTypography variant="caption" color="text" fontWeight="medium">
            Active
          </MDTypography>
        ),
      },
    ],
  };
}
