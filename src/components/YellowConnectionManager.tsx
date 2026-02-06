"use client";

import { useEffect, useRef } from "react";
import { useYellow } from "@/context/YellowProvider";
import { useAppKitAccount } from "@reown/appkit/react";

export default function YellowConnectionManager() {
  const { connect, status } = useYellow();
  const { isConnected } = useAppKitAccount();
  const hasInitiated = useRef(false);

    useEffect(() => {
    // 1. Only trigger if Wallet is Connected AND Yellow is Disconnected
    if (isConnected && status === "disconnected" && !hasInitiated.current) {
      console.log("🔄 Auto-connecting to Yellow Network...");
      hasInitiated.current = true; // Prevent double-firing in React Strict Mode
      connect().finally(() => {
        // Optional: Reset flag if connection fails so we can try again later
        // hasInitiated.current = false;
      });
    }

    // Reset the ref if the user explicitly disconnects wallet
    if (!isConnected) {
      hasInitiated.current = false;
    }
  }, [isConnected, status, connect]);

  return null; // This component is invisible
}
