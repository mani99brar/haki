"use client";

import React from "react";
import { useYellow } from "@/context/YellowProvider";
import "./YellowStatus.css";

export default function YellowStatus() {
  // 1. Destructure the NEW names from your updated Provider
  const { status, connect, signSession, activeChannelId } = useYellow();

  // 2. Map the new 4-state Enum to UI styles
  const getStatusConfig = () => {
    switch (status) {
      case "connecting":
        return { label: "CONNECTING...", cssClass: "status-wait" };
      case "waiting-signature":
        return { label: "SIGN REQ", cssClass: "status-sign" };
      case "connected":
        return { label: "L3 ACTIVE", cssClass: "status-active" };
      case "disconnected":
      default:
        return { label: "OFFLINE", cssClass: "status-off" };
    }
  };

  const config = getStatusConfig();

  // 3. Smart Action Handler
  const handleAction = async () => {
    if (status === "disconnected") {
      connect(); // Retry connection
    } else if (status === "waiting-signature") {
      await signSession(); // Trigger wallet signature
    }
  };

  // 4. Decide if we need an action button
  const showButton =
    status === "disconnected" || status === "waiting-signature";
  const buttonLabel = status === "waiting-signature" ? "SIGN NOW" : "CONNECT";

  return (
    <div className={`yellow-status-pill ${config.cssClass}`}>
      <div className="status-indicator">
        <p className="status-indicator-title">L3 Status</p>
        <span className="status-dot"></span>
        <span className="status-label">{config.label}</span>
      </div>

      {/* Only show Channel ID when connected */}
      {status === "connected" && activeChannelId && (
        <div className="channel-id-tag">
          CH_ID: {activeChannelId.slice(0, 6)}...
        </div>
      )}

      {/* Action Button for Manual Intervention */}
      {showButton && (
        <button className="reconnect-btn-brutal" onClick={handleAction}>
          {buttonLabel}
        </button>
      )}

      {/* Tiny Spinner for Connecting state */}
      {status === "connecting" && <div className="loading-spinner-tiny"></div>}
    </div>
  );
}
