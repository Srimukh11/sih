/**
 * OfflineCard Component
 * Reusable component for displaying offline/no-data states
 */
import { Card, Box, Typography } from "@mui/material";
import SignalCellularConnectedNoInternet0BarIcon from "@mui/icons-material/SignalCellularConnectedNoInternet0Bar";

function OfflineCard({ title, subtitle = "No live sensor data", height = "200px" }) {
  return (
    <Card
      sx={{
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.5,
        backgroundColor: "#f5f5f5",
        border: "1px dashed #ccc",
      }}
    >
      <SignalCellularConnectedNoInternet0BarIcon
        sx={{ fontSize: 48, color: "#9e9e9e", mb: 2 }}
      />
      <Typography variant="h6" color="textSecondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {subtitle}
      </Typography>
    </Card>
  );
}

export default OfflineCard;
