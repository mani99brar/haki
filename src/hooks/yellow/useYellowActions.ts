import { useState, useCallback } from "react";
import { useYellow } from "../../context/YellowProvider"; // Import the consumer
import { createGetLedgerBalancesMessage } from "@erc7824/nitrolite";
import { Address, formatUnits } from "viem";

export function useYellowActions() {
  // 1. Get the global single socket & helper from context
  const { ws, sendMessage, status } = useYellow();

    const [balance, setBalance] = useState<string>("0");
    const [asset, setAsset] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

  const getBalance = useCallback(
    async (userAddress: Address, sessionSigner: any) => {
      // Basic check, but 'sendMessage' handles the heavy lifting
      console.log("Getting balance");
      if (!ws) return;
      setIsLoading(true);
      console.log("WS REGISTERED");
      try {
        const msg = await createGetLedgerBalancesMessage(
          sessionSigner,
          userAddress,
          Date.now(),
        );
        console.log("MSG");
        console.log(msg);

        // Setup Listener (same as before)
        const listener = (event: MessageEvent) => {
          const response = JSON.parse(event.data.toString());
          console.log("BALANCE res", response);
          if (response.res?.[1] === "get_ledger_balances") {
            console.log("BAALNCE");
            console.log(response.res[2].ledger_balances[0]);
            setBalance(
              formatUnits(response.res[2].ledger_balances[0].amount, 6),
            );
            setAsset(response.res[2].ledger_balances[0].asset);
            setIsLoading(false);
            ws.removeEventListener("message", listener);
          }
        };

        // Add listener to the GLOBAL socket
        ws.addEventListener("message", listener);

        // Use the safe sender!
        await sendMessage(msg);
      } catch (err) {
        setIsLoading(false);

        console.error("Balance fetch failed", err);
      }
    },
    [ws, sendMessage],
  );

  return { getBalance, balance, asset, isLoading };
}
