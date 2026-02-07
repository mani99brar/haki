import { useState, useCallback } from "react";
import { useYellow } from "@/context/YellowProvider";
import {
  createCreateChannelMessage,
  createResizeChannelMessage,
  createCloseChannelMessage,
} from "@erc7824/nitrolite";
import { Address } from "viem";
import { ASSET_ADDRESS } from "@/utils/consts";

export function useYellowChannel() {
  // Consume global state
  const { ws, status, activeChannelId, sessionSigner, sendMessage, client } =
    useYellow();

  console.log("FROM YELLOWCHANNEL", activeChannelId);

  const [isProcessing, setIsProcessing] = useState(false);

  // ACTION: Create Channel (If none exists)
  const createChannel = async () => {
    if (!ws || !sessionSigner) return;
    setIsProcessing(true);

    try {
      const createMsg = await createCreateChannelMessage(sessionSigner, {
        chain_id: 11155111,
        token: "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb", // ytest.usd
      });
      sendMessage(createMsg);
      // NOTE: The 'create_channel' response is handled in the Provider,
      // but to submit the TX, you might need to listen for it here
      // or move the submission logic to the Provider too.
    } catch (e: any) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  // ACTION: Fund Channel
  const fundChannel = async (amount: bigint, userAddress: string) => {
    if (!activeChannelId || !ws || !sessionSigner) return;

    try {
      const resizeMsg = await createResizeChannelMessage(sessionSigner, {
        channel_id: activeChannelId as `0x${string}`,
        allocate_amount: amount,
        funds_destination: userAddress as Address,
      });
      sendMessage(resizeMsg);
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * ACTION: Close Channel (Cooperative Close)
   * This sends a signed intent to the Clearnode to finalize the state.
   * Once successful, the channel status on-chain will move to 'Closed' (2).
   */
  const closeChannel = useCallback(
    async (address: Address) => {
      // This will now log the actual values because the function
      // is recreated whenever they change
      console.log("DEBUG [closeChannel]:", {
        activeChannelId,
        hasWs: !!ws,
        hasSigner: !!sessionSigner,
      });

      if (!activeChannelId || !ws || !sessionSigner) {
        throw new Error(
          "Yellow session not fully initialized. Check connection.",
        );
      }

      setIsProcessing(true);
      try {
        const closeMsg = await createCloseChannelMessage(
          sessionSigner,
          activeChannelId as `0x${string}`,
          address,
        );

        sendMessage(closeMsg);
        console.log("🔌 Close request sent for:", activeChannelId);
      } catch (e) {
        console.error("Close channel failed:", e);
        throw e;
      } finally {
        setIsProcessing(false);
      }
      // ADD ALL DEPENDENCIES HERE
    },
    [activeChannelId, ws, sessionSigner, sendMessage],
  );

  // Inside useYellowChannel hook
  const settleOnChain = async (amount: bigint) => {
    if (!client || !activeChannelId) throw new Error("Client not ready");

    setIsProcessing(true);
    try {
      // FIX: Using 'withdrawal' as per SDK definition
      const tx = await client.withdrawal(
        ASSET_ADDRESS, // ytest.usd
        amount, // The total amount you are settling
      );

      console.log("⚓ Settlement Transaction Hash:", tx);
      return tx;
    } catch (e) {
      console.error("On-chain settlement failed:", e);
      throw e;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    createChannel,
    fundChannel,
    status, // 'active' means you have a channel ready
    activeChannelId,
    isProcessing,
    closeChannel,
    settleOnChain,
  };
}
