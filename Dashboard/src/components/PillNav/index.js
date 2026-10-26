/**
 * PillNav Component
 * Floating pill-shaped navigation bar for FaultEye
 * Uses Framer Motion for smooth animations
 */

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import MapIcon from "@mui/icons-material/Map";
import DescriptionIcon from "@mui/icons-material/Description";
import DevicesIcon from "@mui/icons-material/Devices";
import WarningIcon from "@mui/icons-material/Warning";
import InsightsIcon from "@mui/icons-material/Insights";

function PillNav() {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Operations Overview", icon: <DashboardIcon /> },
    { path: "/locations", label: "Asset Health", icon: <MapIcon /> },
    { path: "/logs", label: "Incident Logs", icon: <DescriptionIcon /> },
    { path: "/device", label: "Network Status", icon: <DevicesIcon /> },
    { path: "/response-team", label: "Field Teams", icon: <WarningIcon /> },
    { path: "/predictions", label: "Diagnostics", icon: <InsightsIcon /> },
  ];

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: "20px",
        left: "30%",
        transform: "translateX(-50%)",
        zIndex: 10000,
      }}
    >
      <MDBox
        sx={{
          display: "flex",
          gap: 0.5,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderRadius: "50px",
          padding: "8px 12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link key={item.path} to={item.path} style={{ textDecoration: "none" }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <MDBox
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    padding: "10px 20px",
                    borderRadius: "40px",
                    backgroundColor: isActive ? "rgba(25, 118, 210, 0.15)" : "transparent",
                    color: isActive ? "#1976d2" : "#7b809a",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: isActive
                        ? "rgba(25, 118, 210, 0.25)"
                        : "rgba(123, 128, 154, 0.1)",
                    },
                  }}
                >
                  <MDBox
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: "20px",
                    }}
                  >
                    {item.icon}
                  </MDBox>
                  <MDTypography
                    variant="button"
                    fontWeight={isActive ? "bold" : "regular"}
                    sx={{
                      fontSize: "0.875rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </MDTypography>
                </MDBox>
              </motion.div>
            </Link>
          );
        })}
      </MDBox>
    </motion.div>
  );
}

export default PillNav;
