import { useState, useCallback, useEffect } from "react";
import { useYellow } from "../../context/YellowProvider";
import { createGetLedgerBalancesMessage } from "@erc7824/nitrolite";
import { Address, formatUnits } from "viem";

export function useYellowActions(userAddress?: Address) {
  const { ws, sendMessage, sessionSigner, status } = useYellow();
  const [balance, setBalance] = useState<string | null>(null);
  const [asset, setAsset] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchBalance = useCallback(async () => {
    console.log("Fetching balance for", userAddress);
    // We need the socket, the signer, and the address to proceed
    if (!ws || !userAddress || status == "disconnected") return;
    console.log("WebSocket ready, fetching balance...");
    setIsLoading(true);
    try {
      const msg = await createGetLedgerBalancesMessage(
        sessionSigner,
        userAddress,
        Date.now(),
      );

      const listener = (event: MessageEvent) => {
        const response = JSON.parse(event.data.toString());

        // Response index check depends on your Nitro version
        if (response.res?.[1] === "get_ledger_balances") {
          const firstBalance = response.res[2].ledger_balances?.[0];
          if (firstBalance) {
            setBalance(formatUnits(firstBalance.amount, 6));
            setAsset(firstBalance.asset);
          }
          setIsLoading(false);
          ws.removeEventListener("message", listener);
        }
      };

      ws.addEventListener("message", listener);
      sendMessage(msg);
    } catch (err) {
      console.error("Error fetching balance:", err);
      setIsLoading(false);
      console.error("Balance fetch failed", err);
    }
  }, [ws, sendMessage, sessionSigner, userAddress, status]);

  // AUTOMATION: Trigger whenever connection status or user identity changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, asset, isLoading, refreshBalance: fetchBalance };
}
