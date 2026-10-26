/**
 * GlobalHeader Component
 * Invisible structural header - exists for positioning only
 * No background, no shadow, completely transparent
 */

import React from "react";
import { motion } from "framer-motion";
import PillNav from "components/PillNav";
import { useWebSocket } from "hooks/useWebSocket";
import "./GlobalHeader.css";

function GlobalHeader() {
  const { connected } = useWebSocket();

  return (
    <>
      {/* Invisible Structural Header - Fixed positioning container */}
      <div className="fe-header-invisible">
        {/* Connection Status - Left Side */}
        <motion.div
          className="fe-header-right"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={`status-dot ${connected ? "online" : "offline"}`} />
          <span className="status-text">{connected ? "System Online" : "System Offline"}</span>
        </motion.div>

        {/* Logo - Right Side */}
        <motion.div
          className="fe-header-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src="/logo_FaultEye.svg"
            alt="FaultEye"
            className="fe-logo"
          />
        </motion.div>
      </div>

      {/* PillNav - Centered (independent from header) */}
      <PillNav />
    </>
  );
}

export default GlobalHeader;
