"use client";

import React, { useState, useMemo } from "react";
import TransactionModal, { TransactionStep } from "./TransactionModal";
import { useYellowChannel } from "@/hooks/yellow/useYellowChannel";
import { Address } from "viem";
import { useAppKitAccount } from "@reown/appkit/react";

interface WithdrawButtonProps {
  marketTitle: string;
}

export function WithdrawButton({ marketTitle }: WithdrawButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { closeChannel, activeChannelId, settleOnChain } = useYellowChannel();
  const { address } = useAppKitAccount();

  // FIX: Use useMemo so the steps always have the latest activeChannelId
  const steps: TransactionStep[] = useMemo(
    () => [
      {
        id: "close-yellow",
        title: "Finalize Yellow Session",
        description: `Closing channel ${activeChannelId?.slice(0, 6)}...`,
        status: currentStepIndex === 0 ? "active" : "success",
        action: {
          label: "SIGN & CLOSE",
          onClick: async () => {
            // This will now have the fresh activeChannelId!
            console.log("Modal Triggering Close with ID:", activeChannelId);
            if (!address) return;
            await closeChannel(address as Address);
            setCurrentStepIndex(1);
          },
        },
      },
      {
        id: "sync-chain",
        title: "Blockchain Sync",
        description: "Waiting for Sepolia confirmation...",
        status:
          currentStepIndex === 1
            ? "processing"
            : currentStepIndex > 1
              ? "success"
              : "pending",
        autoProgressDelay: 4000,
      },
      {
        id: "claim-haki",
        title: "Settle On-Chain",
        description: "Submitting Merkle proof...",
        status: currentStepIndex === 2 ? "active" : "pending",
        action: {
          label: "CLAIM WINNINGS",
          onClick: async () => {
            // Claim logic here
            const tx = await settleOnChain(BigInt(10000));
            console.log(tx);
            setCurrentStepIndex(3);
          },
        },
      },
    ],
    [activeChannelId, currentStepIndex, address, closeChannel, settleOnChain],
  ); // Re-calculate when these change

  const handleWithdraw = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop parent card click
    setIsOpen(true);
  };

  return (
    <>
      <button className="withdraw-btn-brutal" onClick={handleWithdraw}>
        WITHDRAW
      </button>

      <TransactionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={marketTitle}
        steps={steps} // Pass the fresh steps
        currentStepIndex={currentStepIndex}
        onStepComplete={(id) => {
          if (id === "sync-chain") setCurrentStepIndex(2);
        }}
      />
    </>
  );
}
