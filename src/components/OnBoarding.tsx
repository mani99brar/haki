"use client";

import React, { useState, useEffect, useMemo } from "react";
import TransactionModal, { TransactionStep } from "./TransactionModal";
import { useYellow } from "@/context/YellowProvider";
import { requestFaucetTokens } from "@/utils/yellowFaucet";
import { useAccount } from "wagmi";

export default function OnboardingManager() {
  const { status, activeChannelId, requestSignature, jwt, connect } =
    useYellow();

  const { address } = useAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);

  // 1. Initial Connection
  useEffect(() => {
    if (isOpen && status === "disconnected") {
      connect();
    }
  }, [isOpen, status, connect]);

  // 2. Initial Modal Trigger
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("haki_onboarded");
    // If no active channel and hasn't seen onboarding, show it
    if (!activeChannelId && !hasSeenOnboarding && !isOpen) {
      setIsOpen(true);
    }
  }, [activeChannelId, isOpen]);

  // 3. Automation: Auto-advance from Auth to Faucet
  useEffect(() => {
    if (jwt && currentStepIndex === 0) {
      setCurrentStepIndex(1);
    }
  }, [jwt, currentStepIndex]);

  const steps: TransactionStep[] = useMemo(
    () => [
      {
        id: "auth-session",
        title: "Authorize Session",
        description: jwt
          ? "Session Key validated."
          : "Sign to authorize your L3 session.",
        status: jwt
          ? "success"
          : status === "waiting-signature"
            ? "active"
            : "pending",
        action: {
          label: jwt ? "AUTHORIZED" : "AUTHORIZE",
          onClick: async () => await requestSignature(),
        },
      },
      {
        id: "fuel-up",
        title: "Fuel Account",
        description: isFaucetLoading
          ? "Requesting tokens..."
          : "Get testnet USDC to start trading.",
        status:
          currentStepIndex === 1
            ? "active"
            : currentStepIndex > 1
              ? "success"
              : "pending",
        action: {
          label: isFaucetLoading ? "WAITING..." : "GET TOKENS",
          onClick: async () => {
            if (!address) return;
            setIsFaucetLoading(true);
            try {
              await requestFaucetTokens(address);
              // Wait a beat for the faucet to actually process
              setTimeout(() => {
                setIsFaucetLoading(false);
                setCurrentStepIndex(2); // Move to final step
              }, 2000);
            } catch (e) {
              console.error("Faucet error", e);
              setIsFaucetLoading(false);
              // We move forward anyway so the user isn't stuck if they already have tokens
              setCurrentStepIndex(2);
            }
          },
        },
      },
      {
        id: "enter-haki",
        title: "Trade Ready",
        description: "Your session is ready for the prediction markets.",
        status: currentStepIndex === 2 ? "active" : "pending",
        action: {
          label: "ENTER HAKI",
          onClick: () => {
            localStorage.setItem("haki_onboarded", "true");
            setIsOpen(false);
          },
        },
      },
    ],
    [jwt, status, address, currentStepIndex, requestSignature, isFaucetLoading],
  );

  return (
    <TransactionModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="HAKI CLEARING SETUP"
      steps={steps}
      currentStepIndex={currentStepIndex}
      disableBackdropClose={true}
    />
  );
}
