"use client";

import { useState } from "react";
import { useYellow } from "@/context/YellowProvider";
import { createTransferMessage } from "@erc7824/nitrolite";
import { parseUnits } from "viem";
import { HAKI_VAULT } from "@/utils/consts";
import { useAccount } from "wagmi";
import { privateKeyToAccount } from "viem/accounts";


export function useYellowTrade() {
  const { sessionSigner, sendMessage, status, activeChannelId } = useYellow();
  const { address: walletAddress } = useAccount();
  const [isTrading, setIsTrading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const placeBet = async (
    amount: string,
    marketId: string, // UUID from Supabase
    optionId: string, // UUID from Supabase
    shares: number, // Number of shares from your preview hook
  ) => {
    setMessage("");
    setError("");
    if (status === "disconnected" || !sessionSigner || !walletAddress) {
      setError("Please connect your wallet and Yellow session first.");
      console.warn("⚠️ Session or Wallet not ready.");
      return;
    }

    setIsTrading(true);

    try {
      // 1. Prepare L3 Transfer Parameters
      const params = {
        destination: HAKI_VAULT as `0x${string}`,
        allocations: [
          {
            asset: "ytest.usd",
            destination: HAKI_VAULT,
            amount: parseUnits(amount, 6).toString(),
          },
        ],
      };

      // 2. Generate the Signed Message for Yellow
      // This creates the 'signedPayload' and 'signature' required by your DB
      const transferMsg = await createTransferMessage(sessionSigner, params);
      const parsedMsg = JSON.parse(transferMsg);
      console.log("PARSED TRASNFER", parsedMsg.req);

      // The nitrolite SDK returns [type, payload, signature]
      const signedPayload =
        parsedMsg.req[2].allocations[0].asset +
        "-" +
        parsedMsg.req[2].allocations[0].amount +
        "-" +
        parsedMsg.req[2].allocations[0].destination;
      const signature = parsedMsg.sig[0];

      // 3. Send to Yellow Network (L3 Collateral Move)
      sendMessage(transferMsg);

      // 4. Sync to Supabase (Record Shares & Update AMM)
      const dbResponse = await fetch("/api/market/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId,
          optionId,
          shares,
          signedPayload,
          signature,
          channelId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          wallet: walletAddress,
        }),
      });

      const dbData = await dbResponse.json();

      if (!dbResponse.ok) {
        throw new Error(dbData.error || "DB Trade execution failed");
      }
      return dbData.trade;
    } catch (error) {
      setMessage("Trade failed. Please try again.");
      console.error("❌ Haki Trade Error:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setMessage("Share bought successfully!");
      setIsTrading(false);
    }
  };

  const sellShares = async (
    amount: string, // Expected payout amount from preview
    marketId: string,
    optionId: string,
    sharesToSell: number,
  ) => {
    setMessage("");
    setError("");
    if (status === "disconnected" || !sessionSigner || !walletAddress) {
      setError("Please connect your wallet and Yellow session first.");
      console.warn("⚠️ Session or Wallet not ready.");
      return;
    }
    setIsTrading(true);
    const sessionKey = localStorage.getItem("yellow_session_sk");
    if (!sessionKey) throw new Error("Missing session key");

    const account = privateKeyToAccount(sessionKey as `0x${string}`);
    try {
      const signedPayload = marketId + "-" + optionId + "-" + sharesToSell;
      const signature = account.signMessage({ message: signedPayload });

      // We hit the backend. The backend verifies this session signature
      // and then its own Clearnode signs the actual payout.
      console.log("SELLING");
      const response = await fetch("/api/market/execute-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId,
          optionId,
          shares: -Math.abs(sharesToSell),
          walletAddress,
          signature, // Session signature
          signedPayload,
          channelId: activeChannelId
            ? activeChannelId
            : "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        }),
      });
      console.log("SELL RESPONSE", response);
      setIsTrading(false);
      return await response.json();
    } catch (err) {
      console.error("❌ Sell shares failed:", err);
      setError("Failed to execute sell shares");
    } finally {
      setMessage("Share sold successfully!");
      setIsTrading(false);
    }
  };

  return { placeBet, sellShares, isTrading, message, error };
}
