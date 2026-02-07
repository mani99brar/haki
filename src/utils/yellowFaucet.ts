export async function requestFaucetTokens(userAddress: string) {
  const response = await fetch(
    "https://clearnet-sandbox.yellow.com/faucet/requestTokens",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userAddress }),
    },
  );

    if (!response.ok) {
        throw new Error("Faucet request failed. The node might be rate-limited.");
    }
  return response.json();

  }


