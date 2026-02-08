"use client";

import React, { useState, useEffect, useMemo } from "react";
import TransactionModal, { TransactionStep } from "./TransactionModal";
import { useYellow } from "@/context/YellowProvider";
import { requestFaucetTokens } from "@/utils/yellowFaucet"; // Ensure this path is correct
import { useAccount } from "wagmi";

export default function OnboardingManager() {
  // 1. UPDATED DESTRUCTURING: use 'signSession' instead of 'requestSignature'
  const { status, jwt, connect, signSession } = useYellow();
  const { address } = useAccount();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);

  // 2. Trigger Onboarding if not onboarded
  useEffect(() => {
    const hasSeen = localStorage.getItem("haki_onboarded");
    // Show if user connected wallet but hasn't finished Haki setup
    if (address && !hasSeen && !isOpen) {
      setIsOpen(true);
    }
  }, [address, isOpen]);

  // 3. Auto-Connect when Modal Opens
  useEffect(() => {
    if (isOpen && status === "disconnected") {
      connect();
    }
  }, [isOpen, status, connect]);

  // 4. Auto-Advance Step 1 -> Step 2 (Once JWT exists)
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
          ? "Session Validated."
          : status === "connecting"
            ? "Connecting to Yellow Network..."
            : "Sign to authorize your L3 session.",
        status: jwt
          ? "success"
          : status === "waiting-signature" || status === "connecting"
            ? "active"
            : "pending",
        action: {
          // Logic: If we have JWT, we are done. If waiting, user must click.
          label: jwt
            ? "AUTHORIZED"
            : status === "connecting"
              ? "CONNECTING..."
              : "AUTHORIZE",
          disabled: status === "connecting" || !!jwt, // Disable if busy or done
          onClick: async () => {
            // 5. Use the new function name
            await signSession();
          },
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
              // Assuming requestFaucetTokens is your utility
              await requestFaucetTokens(address);

              // Artificial delay for UX "feeling"
              setTimeout(() => {
                setIsFaucetLoading(false);
                setCurrentStepIndex(2);
              }, 2000);
            } catch (e) {
              console.error("Faucet error", e);
              setIsFaucetLoading(false);
              // Advance anyway to not block user
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
    [jwt, status, address, currentStepIndex, signSession, isFaucetLoading],
  );

  // If wallet isn't connected, don't show anything (or show a "Connect Wallet" prompt)
  if (!address) return null;

  return (
    <TransactionModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="HAKI CLEARING SETUP"
      steps={steps}
      currentStepIndex={currentStepIndex}
      disableBackdropClose={true} // Force them to finish
    />
  );
}
