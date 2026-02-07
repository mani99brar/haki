// src/app/api/market/execute-sell/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createECDSAMessageSigner,
  createTransferMessage,
  createEIP712AuthMessageSigner,
} from "@erc7824/nitrolite";
import { parseUnits, Hex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import WebSocket from "ws"; // Ensure 'ws' is installed
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const HAKI_PRIVATE_KEY = process.env.HAKI_VAULT_PRIVATE_KEY as Hex;
const HAKI_ADDRESS = process.env.HAKI_VAULT_ADDRESS as `0x${string}`;
const CLEARNODE_URL = "wss://clearnet-sandbox.yellow.com/ws";

export async function POST(req: NextRequest) {
  try {
    const {
      marketId,
      optionId,
      shares,
      walletAddress,
      signature,
      signedPayload,
      channelId,
    } = await req.json();
    console.log("SELLING");
    console.log("")
    // --- 1. Supabase Atomic Trade ---
    const { data: tradeData, error: tradeError } = await supabase.rpc(
      "execute_trade",
      {
        p_wallet: walletAddress,
        p_market: marketId,
        p_option: optionId,
        p_shares_delta: shares,
        p_signed_payload: signedPayload,
        p_signature: signature,
        p_channel_id: channelId
      },
    );
      console.log(tradeData);
    if (tradeError) throw new Error(tradeError.message);

    // --- 2. Setup Server-Side Nitrolite Signer ---
    const payoutAmount = Math.abs(tradeData[0].cost).toString();
    const sessionKey = generatePrivateKey(); // Temporary key for this payout session
    const sessionAccount = privateKeyToAccount(sessionKey);
    const sessionSigner = createECDSAMessageSigner(sessionKey);
    const params = {
      address: HAKI_ADDRESS,
      application: "Haki-Settler",
      session_key: sessionAccount.address,
      allowances: [{ asset: "ytest.usd", amount: "10000000000000000000000" }],
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 36000), // Fixed timestamp
      scope: "settlement",
    };

    // --- 3. Execute Transfer via WebSocket ---
    const payoutResult = await new Promise((resolve, reject) => {
      const ws = new WebSocket(CLEARNODE_URL);
      
      ws.onopen = async () => {
        
        // Auth Request (Broker-style)
        const authMsg = await createAuthRequestMessage(params);
        ws.send(authMsg);
      };

      ws.onmessage = async (event) => {
        const response = JSON.parse(event.data.toString());
        console.log(response);
        const [, type, payload,] = response.res || [];
        
        

        // Step A: Handle Auth Challenge (Sign with Vault Private Key)
        if (type === "auth_challenge") {
          const account = privateKeyToAccount(HAKI_PRIVATE_KEY);
          const walletClient = createWalletClient({
                  chain: sepolia,
                  transport: http(),
                  account
            });
          const signer = createEIP712AuthMessageSigner(
            walletClient,
            {
              session_key: params.session_key,
              allowances: params.allowances,
              expires_at: params.expires_at,
              scope: params.scope,
            },
            { name: "Haki-Settler" },
          );

          // In a real TEE/Production env, you'd use createEIP712AuthMessageSigner
          // but since we have the PK directly, we can use simple ECDSA verify from challenge
          const verifyMsg = await createAuthVerifyMessageFromChallenge(
            signer, // The session key we are authorizing
            payload.challenge_message,
          );
          ws.send(verifyMsg);
        }

        // Step B: Once Authenticated, send the actual Transfer
        if (type === "auth_verify" || (response.result && !response.error)) {
          const transferParams = {
            destination: walletAddress as `0x${string}`,
            allocations: [
              {
                asset: "ytest.usd",
                destination: walletAddress as `0x${string}`,
                amount: parseUnits(payoutAmount, 6).toString(),
              },
            ],
          };

          const transferMsg = await createTransferMessage(
            sessionSigner,
            transferParams,
          );
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              method: "nitrolite_sendMessage",
              params: [transferMsg],
              id: 1,
            }),
          );
          ws.close();
        }

        // Step C: Catch successful send
        if (response.id === 1) {
          ws.close();
          resolve(true);
        }
      };

      ws.onerror = ()=> reject;
    });
    console.log("PAYOUT RESULT",payoutResult);
    return NextResponse.json({ success: true, payout: payoutAmount });
  } catch (error: any) {
    console.error("SETTLEMENT_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
