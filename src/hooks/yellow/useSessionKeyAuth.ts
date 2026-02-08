// /hooks/useSessionKeyAuth.ts
import { useState } from "react";
import { createWalletClient, custom, getAddress, verifyTypedData } from "viem";
import { sepolia } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export function useSessionKeyAuth() {
  const [loading, setLoading] = useState(false);

  async function authenticate(userAddress: `0x${string}`) {
    setLoading(true);
    try {
      if (!(window as any).ethereum) throw new Error("No wallet found");

      // 1. Generate ephemeral session key
      const privateKey = generatePrivateKey();
      const sessionAccount = privateKeyToAccount(privateKey);
      const sessionKeyAddress = sessionAccount.address;

      // 2. Wallet client
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
      });


      // 3. Use checksum addresses (CRITICAL)
      const checksumUserAddress = getAddress(userAddress);
      const checksumSessionAddress = getAddress(sessionKeyAddress);

      // 4. Time handling
      const nowMs = Date.now();
      const expiresAtMs = BigInt(nowMs + 24 * 60 * 60 * 1000); // +24h

      // 5. Build auth_request params
      const params = {
        address: checksumUserAddress,
        session_key: checksumSessionAddress,
        application: "Haki",
        allowances: [],
        scope: "",
        expires_at: Number(expiresAtMs), // Convert to number for JSON
      };

      console.log("=== STEP 1: auth_request params ===");
      console.log(JSON.stringify(params, null, 2));

      // 6. Send auth_request
      const authRequestArray = [1, "auth_request", params, nowMs];

      const res = await fetch("/api/auth/session-key/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ req: authRequestArray }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Initial request failed");

      // 7. Handle challenge
      if (result.status === "challenge_required") {
        console.log("\n=== STEP 2: Received Challenge ===");
        console.log("Challenge:", result.challenge);

        // 8. Prepare EIP-712 data EXACTLY as Yellow specifies
        const eip712Data = {
          domain: { name: "Haki" },
          types: {
            EIP712Domain: [{ name: "name", type: "string" }],
            Policy: [
              { name: "challenge", type: "string" },
              { name: "scope", type: "string" },
              { name: "wallet", type: "address" },
              { name: "session_key", type: "address" },
              { name: "expires_at", type: "uint64" },
              { name: "allowances", type: "Allowance[]" },
            ],
            Allowance: [
              { name: "asset", type: "string" },
              { name: "amount", type: "string" },
            ],
          },
          primaryType: "Policy" as const,
          message: {
            challenge: result.challenge,
            scope: "",
            wallet: checksumUserAddress,
            session_key: checksumSessionAddress,
            expires_at: expiresAtMs,
            allowances: [],
          },
        } as const;

        console.log("\n=== STEP 3: EIP-712 Data to Sign ===");
        console.log(
          JSON.stringify(
            eip712Data,
            (key, value) =>
              typeof value === "bigint" ? value.toString() : value,
            2,
          ),
        );

        // 9. Sign EIP-712
        const eip712Signature = await walletClient.signTypedData({
          account: checksumUserAddress,
          ...eip712Data,
        });

        console.log("\n=== STEP 4: EIP-712 Signature ===");
        console.log("Signature:", eip712Signature);
        console.log("Length:", eip712Signature.length);

        // 10. Verify signature locally
        try {
          const isValid = await verifyTypedData({
            address: checksumUserAddress,
            ...eip712Data,
            signature: eip712Signature,
          });
          console.log("✅ Local verification passed, isValid:", isValid);
        } catch (verifyError) {
          console.error("❌ Local verification failed:", verifyError);
        }

        // 11. Build auth_verify request
        const verifyReqArray = [
          3,
          "auth_verify",
          { challenge: result.challenge }, // NO signature field here
          Date.now(),
        ];

        console.log("\n=== STEP 5: auth_verify Request ===");
        console.log("Request array:", JSON.stringify(verifyReqArray));

        // 12. Send to backend
        const finalRes = await fetch("/api/auth/session-key/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reqArray: verifyReqArray,
            sig: [eip712Signature], // EIP-712 signature in sig array
          }),
        });

        const finalResult = await finalRes.json();
        if (!finalRes.ok) {
          console.error("❌ Backend error:", finalResult);
          throw new Error(finalResult.error || "Authentication failed");
        }

        console.log("\n✅ Authentication successful!");
        console.log("Result:", finalResult);

        // Store session
        localStorage.setItem("haki_private_key", privateKey);
        localStorage.setItem("haki_address", sessionKeyAddress);

        return true;
      }
    } catch (err) {
      console.error("❌ Authentication Error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { authenticate, loading };
}
