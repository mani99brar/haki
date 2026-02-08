"use client";

import React from "react";
import { useYellow } from "@/context/YellowProvider";
import "./YellowStatus.css";

export default function YellowStatus() {
  const { status, requestSignature, activeChannelId, loading } = useYellow();

  const statusMap = {
    init: { label: "INITIALIZING", class: "status-init" },
    disconnected: { label: "OFFLINE", class: "status-off" },
    "waiting-signature": { label: "SIGN REQ", class: "status-sign" },
    authenticating: { label: "AUTH...", class: "status-wait" },
    connected: { label: "CONNECTED", class: "status-ready" },
    active: { label: "SESSION ACTIVE", class: "status-active" },
  };

  // Determine current display based on status, but override label if loading is true
  const current = statusMap[status] || statusMap.disconnected;
  const displayLabel = loading ? "PROCESSING..." : current.label;
  const displayClass = loading ? "status-wait" : current.class;

  const handleSignNow = async () => {
    console.log(
      "Attempting to connect or request signature for Yellow session...",
    );
    await requestSignature();
  };

  return (
    <div className={`yellow-status-pill ${displayClass}`}>
      <div className="status-indicator">
        <p className="status-indicator-title">L3 Status</p>
        <span className="status-dot"></span>
        <span className="status-label">{displayLabel}</span>
      </div>

      {activeChannelId && !loading && (
        <div className="channel-id-tag">
          {activeChannelId.slice(0, 6)}...{activeChannelId.slice(-4)}
        </div>
      )}

      {/* Button is hidden during loading to prevent spamming the connection */}
      {!loading &&
        (status === "disconnected" || status === "waiting-signature") && (
          <button className="reconnect-btn-brutal" onClick={handleSignNow}>
            {status === "waiting-signature" ? "SIGN NOW" : "CONNECT L3"}
          </button>
        )}

      {loading && <div className="loading-spinner-tiny"></div>}
    </div>
  );
}
