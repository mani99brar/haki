"use client";

import { useState } from "react";
import { useYellow } from "@/context/YellowProvider";
import { createTransferMessage } from "@erc7824/nitrolite";
import { parseUnits } from "viem";
import { HAKI_ADDRESS, ASSET_ADDRESS } from "@/utils/consts";

export function useYellowTrade() {
  const { activeChannelId, sessionSigner, sendMessage, status } = useYellow();
  const [isTrading, setIsTrading] = useState(false);

  const placeBet = async (
    amount: string,
  ) => {
    console.log(parseUnits(amount, 6).toString());
    if (status == "disconnected") {
      console.warn("⚠️ Yellow session not active.");
      return;
    }

    setIsTrading(true);

    try {
      // The asset address used in your channel (ytest.usd)


      const params = {
        destination: HAKI_ADDRESS as `0x${string}`,
        allocations: [
          {
            // FIX: You need both asset AND destination inside the allocation
            asset: "ytest.usd",
            destination: HAKI_ADDRESS, // Recipient address
            amount: parseUnits(amount, 6).toString(),
          },
        ],
      };

      const transferMsg = await createTransferMessage(
        sessionSigner,
        params,
      );

      sendMessage(transferMsg);
      console.log(`🚀 Bet sent with asset ${ASSET_ADDRESS}`);
    } catch (error) {
      console.error("❌ Haki Trade Error:", error);
    } finally {
      setIsTrading(false);
    }
  };

  return { placeBet, isTrading };
}
