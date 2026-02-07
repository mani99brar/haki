"use client";

import React, { useState, useEffect, useMemo } from "react";
import TransactionModal, { TransactionStep } from "./TransactionModal";
import { useYellow } from "@/context/YellowProvider";
import { useYellowChannel } from "@/hooks/yellow/useYellowChannel";
import { requestFaucetTokens } from "@/utils/yellowFaucet";
import { useAccount } from "wagmi";

export default function OnboardingManager() {
  const { status, activeChannelId, requestSignature, jwt, connect } =
    useYellow();
  const { createChannel } = useYellowChannel();
  const { address } = useAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // 1. Trigger connection when modal opens
  useEffect(() => {
    if (isOpen && status === "disconnected") {
      connect();
    }
  }, [isOpen, status, connect]);

  // 2. Open modal if no channel exists
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("haki_onboarded");
    if (!activeChannelId && !hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, [activeChannelId]);

  // --- AUTOMATION LOGIC ---
  useEffect(() => {
    // Transition from Auth -> Faucet
    if (status === "connected" && currentStepIndex === 0) {
      setCurrentStepIndex(1);
    }

    // Transition from Channel -> Finalize
    // We check currentStepIndex < 3 to avoid infinite loop
    if (activeChannelId && currentStepIndex < 3) {
      setCurrentStepIndex(3);
    }
  }, [status, activeChannelId, currentStepIndex]);

  const steps: TransactionStep[] = useMemo(
    () => [
      {
        id: "auth-session",
        title: "Authorize Session",
        description: jwt
          ? "Session Key validated."
          : "Sign to authorize your session.",
        // Success if we are past this step OR connected
        status:
          status === "connected" || status === "active" || currentStepIndex > 0
            ? "success"
            : status === "authenticating"
              ? "processing"
              : "active",
        action: {
          label: jwt ? "RESUME SESSION" : "AUTHORIZE",
          onClick: async () => {
            await requestSignature();
          },
        },
      },
      {
        id: "fuel-up",
        title: "Fuel Account",
        description: "Requesting testnet USDC from the Yellow Faucet.",
        // Active only if we are exactly on this step
        status:
          currentStepIndex === 1
            ? "active"
            : currentStepIndex > 1
              ? "success"
              : "pending",
        action: {
          label: "GET TOKENS",
          onClick: async () => {
            if (!address) return;
            try {
              await requestFaucetTokens(address);
            } catch (e) {
              console.error("Faucet skip");
            } finally {
              setCurrentStepIndex(2);
            }
          },
        },
      },
      {
        id: "create-channel",
        title: "Create Channel",
        description: "Establishing your L3 clearing channel.",
        // Success if we have an ID, otherwise active if index is 2
        status:
          activeChannelId || currentStepIndex > 2
            ? "success"
            : currentStepIndex === 2
              ? "active"
              : "pending",
        action: {
          label: "OPEN CHANNEL",
          onClick: async () => {
            try {
              await createChannel();
            } catch (e) {
              console.error("Channel skip");
            } finally {
              setCurrentStepIndex(3);
            }
          },
        },
      },
      {
        id: "enter-haki",
        title: "Trade Ready",
        description: "L3 Session active. Welcome to the Haki clearing house.",
        status: currentStepIndex === 3 ? "active" : "pending",
        action: {
          label: "ENTER HAKI",
          onClick: () => {
            localStorage.setItem("haki_onboarded", "true");
            setIsOpen(false);
          },
        },
      },
    ],
    [
      jwt,
      status,
      activeChannelId,
      address,
      currentStepIndex,
      requestSignature,
      createChannel,
    ],
  );

  return (
    <TransactionModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="HAKI ONBOARDING"
      steps={steps}
      currentStepIndex={currentStepIndex}
      disableBackdropClose={true}
    />
  );
}
