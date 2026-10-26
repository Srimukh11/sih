/**
 * Sensor History Chart Component
 * Multi-line chart for recent sensor readings
 */
import PropTypes from "prop-types";
import { Line } from "react-chartjs-2";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function SensorChart({ title, labels, datasets, height }) {
  const chartData = {
    labels: labels || [],
    datasets: (datasets || []).map((ds, idx) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color || ["#1976d2", "#dc004e", "#388e3c", "#f57c00"][idx],
      backgroundColor: (ds.color || ["#1976d2", "#dc004e", "#388e3c", "#f57c00"][idx]) + "20",
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
    scales: {
      x: {
        reverse: false, // Latest data on the right (normal flow)
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Card>
      <MDBox pt={3} px={3}>
        <MDTypography variant="h6" fontWeight="medium">
          {title}
        </MDTypography>
      </MDBox>
      <MDBox p={2} height={height}>
        <Line data={chartData} options={options} />
      </MDBox>
    </Card>
  );
}

SensorChart.defaultProps = {
  height: "300px",
};

SensorChart.propTypes = {
  title: PropTypes.string.isRequired,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  datasets: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      data: PropTypes.arrayOf(PropTypes.number).isRequired,
      color: PropTypes.string,
    })
  ).isRequired,
  height: PropTypes.string,
};

export default SensorChart;
