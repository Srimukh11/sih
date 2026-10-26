/**
=========================================================
* FaultEye Dashboard - MUI Timeline Pipeline View
=========================================================
*/

import React, { useState, useEffect } from "react";
import { Grid, Box, Typography, Card, CardContent } from "@mui/material";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import PipelinePreview from "components/PipelinePreview";
import { useWebSocket } from "hooks/useWebSocket";
import MDBox from "components/MDBox";

function DashboardNew() {
  const { connected } = useWebSocket();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backendHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const backendBaseUrl = `http://${backendHost}:8000`;

    // Fetch pipeline data from backend
    fetch(`${backendBaseUrl}/api/pipelines`)
      .then((response) => response.json())
      .then((data) => {
        setPipelines(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching pipelines:", error);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <DashboardNavbar wsConnected={connected} />
      <MDBox py={3}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Pipeline Monitoring Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time sensor location tracking with RSSI-based distance estimation
          </Typography>
        </Box>

        {loading ? (
          <Card>
            <CardContent>
              <Typography variant="body1" align="center">
                Loading pipeline data...
              </Typography>
            </CardContent>
          </Card>
        ) : pipelines.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="body1" align="center" color="error">
                No pipeline data available. Please check backend connection.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {pipelines.map((pipeline) => (
              <Grid item xs={12} sm={6} md={3} key={pipeline.pipeline_id}>
                <PipelinePreview
                  name={pipeline.name}
                  pipelineId={pipeline.pipeline_id}
                  nodes={pipeline.nodes}
                  showFull={false}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default DashboardNew;
