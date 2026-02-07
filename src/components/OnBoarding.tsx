"use client";

import React, { useState, useEffect, useMemo } from "react";
import TransactionModal, { TransactionStep } from "./TransactionModal";
import { useYellow } from "@/context/YellowProvider";
import { useYellowChannel } from "@/hooks/yellow/useYellowChannel";
import { requestFaucetTokens } from "@/utils/yellowFaucet";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";

export default function OnboardingManager() {
  const {
    status,
    activeChannelId,
    requestSignature,
    jwt,
    connect,
    pendingChannelData,
  } = useYellow();
  const { createChannel, fundChannel, isProcessing, activateChannelOnChain } =
    useYellowChannel();
  const { address } = useAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // 1. Initial Connection
  useEffect(() => {
    if (isOpen && status === "disconnected") {
      connect();
    }
  }, [isOpen, status, connect]);

  // 2. Initial Modal Trigger (Only if not onboarded)
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("haki_onboarded");
    if (!activeChannelId && !hasSeenOnboarding && !isOpen) {
      setIsOpen(true);
    }
  }, [activeChannelId, isOpen]);

  // 3. AUTOMATION: Only move based on actual state changes
  useEffect(() => {
    // Transition from Auth -> Faucet (Step 0 -> 1)
    if (jwt && status === "connected" && currentStepIndex === 0) {
      setCurrentStepIndex(1);
    }
    if (activeChannelId && currentStepIndex == 2) setCurrentStepIndex(3);
  }, [jwt, status, activeChannelId, currentStepIndex]);

  const steps: TransactionStep[] = useMemo(
    () => [
      {
        id: "auth-session",
        title: "Authorize Session",
        description: jwt
          ? "Session Key validated."
          : "Sign to authorize your L3 session.",
        status:
          status === "connected" || currentStepIndex > 0
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
        description: "Requesting testnet USDC from the Yellow Faucet.",
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
              // Move to Step 2 manually since Faucet doesn't change a "Global Status" we track
              setCurrentStepIndex(2);
            } catch (e) {
              setCurrentStepIndex(2);
            }
          },
        },
      },
      // {
      //   id: "create-channel",
      //   title: "Create Channel",
      //   description: "Sign on-chain to activate your clearing channel.",
      //   status:
      //     currentStepIndex === 2
      //       ? "active"
      //       : currentStepIndex > 2
      //         ? "success"
      //         : "pending",
      //   action: {
      //     label: "OPEN CHANNEL",
      //     onClick: async () => {
      //       // 1. Trigger the WS if we don't have data yet
      //       if (!pendingChannelData) {
      //         await createChannel();
      //         // Wait briefly for WS or use a more robust promise-based listener
      //         return;
      //       }
      //     },
      //   },
      // },
      // {
      //   id: "fund-channel",
      //   title: "Fund Channel",
      //   description: "Allocating L3 tokens to your trading session.",
      //   status:
      //     currentStepIndex === 4
      //       ? "active"
      //       : currentStepIndex > 4
      //         ? "success"
      //         : "pending",
      //   action: {
      //     label: "ALLOCATE $20",
      //     onClick: async () => {
      //       if (!address) return;
      //       try {
      //         const amount = parseUnits("20", 6);
      //         await fundChannel(amount, address);
      //         // Move to Final Step manually after funding
      //         setCurrentStepIndex(4);
      //       } catch (e) {
      //         console.error("Funding failed", e);
      //       }
      //     },
      //   },
      // },
      {
        id: "enter-haki",
        title: "Trade Ready",
        description: "L3 session is funded and active.",
        status: currentStepIndex === 4 ? "success" : "pending",
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
      fundChannel,
    ],
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
