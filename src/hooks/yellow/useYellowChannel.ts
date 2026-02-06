import { useState } from "react";
import { useYellow } from "@/context/YellowProvider";
import {
  createCreateChannelMessage,
  createResizeChannelMessage,
} from "@erc7824/nitrolite";
import { Address } from "viem";

export function useYellowSession() {
  // Consume global state
  const { ws, status, activeChannelId, sessionSigner, sendMessage } =
    useYellow();

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

  return {
    createChannel,
    fundChannel,
    status, // 'active' means you have a channel ready
    activeChannelId,
    isProcessing,
  };
}
