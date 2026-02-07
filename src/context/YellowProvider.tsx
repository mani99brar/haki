"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createEIP712AuthMessageSigner,
  createAuthVerifyMessageFromChallenge,
  createAuthVerifyMessageWithJWT,
  NitroliteClient,
  WalletStateSigner,
} from "@erc7824/nitrolite";
import { createWalletClient, custom, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { ASSET_ADDRESS } from "@/utils/consts";

// --- Configuration ---
const CLEARNODE_URL = "wss://clearnet-sandbox.yellow.com/ws";
const STORAGE_KEY_SK = "yellow_session_sk";
const STORAGE_KEY_JWT = "yellow_jwt";

interface YellowContextType {
  ws: WebSocket | null;
  status:
    | "disconnected"
    | "authenticating"
    | "connected"
    | "active"
    | "waiting-signature";
  jwt: string | null;
  activeChannelId: string | null;
  logs: string[];
  connect: () => Promise<void>;
  requestSignature: () => Promise<void>;
  sendMessage: (msg: string) => void;
  client: NitroliteClient | null;
  sessionSigner: any;
  loading: boolean;
  setLoading: (val: boolean) => void;
}

const YellowContext = createContext<YellowContextType | undefined>(undefined);

export function YellowProvider({ children }: { children: ReactNode }) {
  // Global State
  const [status, setStatus] =
    useState<YellowContextType["status"]>("disconnected");
  const [jwt, setJwt] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [pendingYellowConnection, setPendingYellowConnection] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastChallengeRef = useRef<string | null>(null);
  const authParamsRef = useRef<any>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const sessionSignerRef = useRef<any>(null);
  const clientRef = useRef<NitroliteClient | null>(null);

  // Wallet Hooks
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { open } = useAppKit();

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  // --- Helper: Message Sender ---
  const sendMessage = useCallback((msg: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    } else {
      console.warn("⚠️ WebSocket not open, message dropped:", msg);
    }
  }, []);

  // --- INTERNAL: Connection Engine ---
  const executeYellowConnection = useCallback(async () => {
    if (!address || !walletClient) {
      addLog("❌ Error: Wallet not ready for connection");
      return;
    }

    if (
      status !== "disconnected" &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    setStatus("authenticating");
    addLog("🔌 Connecting to Yellow Network...");

    try {
      // 1. Initialize SDK Clients
      const vWalletClient = createWalletClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
        account: address,
      });
      const vPublicClient = createPublicClient({
        chain: sepolia,
        transport: http("https://1rpc.io/sepolia"),
      });

      clientRef.current = new NitroliteClient({
        publicClient: vPublicClient,
        walletClient: vWalletClient,
        stateSigner: new WalletStateSigner(vWalletClient),
        addresses: {
          custody: "0x019B65A265EB3363822f2752141b3dF16131b262",
          adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2",
        },
        chainId: sepolia.id,
        challengeDuration: BigInt(3600),
      });

      // 2. Session Key Logic
      let sessionKey = localStorage.getItem(STORAGE_KEY_SK) as Hex | null;
      if (!sessionKey) {
        sessionKey = generatePrivateKey();
        localStorage.setItem(STORAGE_KEY_SK, sessionKey);
        addLog("🔑 Created new Session Key");
      }
      const sessionAccount = privateKeyToAccount(sessionKey);
      sessionSignerRef.current = createECDSAMessageSigner(sessionKey);

      // 3. Setup WebSocket
      const ws = new WebSocket(CLEARNODE_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
        addLog("🔐 Sending Auth Request...");
        // Define params once
        const params = {
          address: address,
          application: "Haki",
          session_key: sessionAccount.address,
          allowances: [{ asset: "ytest.usd", amount: "1000000000000000000" }],
          expires_at: BigInt(Math.floor(Date.now() / 1000) + 36000), // Fixed timestamp
          scope: "test.app",
        };

        // Save them for requestSignature to use later
        authParamsRef.current = params;

        // Construct auth_request with the token if it exists
        const authMsg = await createAuthRequestMessage(params);

        ws.send(authMsg);
      };;

      ws.onmessage = async (event) => {
        const response = JSON.parse(event.data.toString());
        console.log(response);
        if (response.error) {
          addLog(`❌ Node Error: ${response.error.message}`);
          // If the token was invalid/expired, clear it so next attempt starts fresh
          if (response.error.code === 4001) {
            // Common 'Invalid Token' code
            localStorage.removeItem(STORAGE_KEY_JWT);
            setJwt(null);
          }
          return;
        }

        const type = response.res?.[1];
        const data = response.res?.[2];

        // --- AUTH CHALLENGE: Only triggered if JWT is missing or invalid ---
        if (type === "auth_challenge") {
          addLog("✍️ Session expired or missing. Please sign in Wallet...");
          // FIX: Retrieve JWT from storage to resume session
          const storedJwt = localStorage.getItem(STORAGE_KEY_JWT + address);
          console.log(storedJwt);
          try {
            if (storedJwt) {
              console.log("USING jwt");
              const verifyMsg = await createAuthVerifyMessageWithJWT(storedJwt);
              ws.send(verifyMsg);
            } else {
              // Manual path: Save the challenge and wait
              lastChallengeRef.current = data.challenge_message;
              addLog(
                "⏳ Authorization required. Click the button in the modal.",
              );
              setStatus("waiting-signature");
              // const signer = createEIP712AuthMessageSigner(
              //   vWalletClient,
              //   {
              //     session_key: sessionAccount.address,
              //     allowances: [
              //       { asset: "ytest.usd", amount: "1000000000000000000" },
              //     ],
              //     expires_at: BigInt(Math.floor(Date.now() / 1000) + 36000),
              //     scope: "test.app",
              //   },
              //   { name: "Haki" },
              // );

              // const verifyMsg = await createAuthVerifyMessageFromChallenge(
              //   signer,
              //   data.challenge_message,
              // );
              // ws.send(verifyMsg);
            }
          } catch (e) {
            addLog("❌ Signature rejected by user");
            ws.close();
          }
        }

        // --- AUTH SUCCESS: New JWT issued or existing one validated ---
        if (type === "auth_verify") {
          const newJwt = data.jwt_token;
          if (newJwt) {
            setJwt(newJwt);
            localStorage.setItem(STORAGE_KEY_JWT + data.address, newJwt);
          }
          addLog("✅ Authenticated via Yellow!");
          setStatus("connected");
        }

        if (type === "channels") {
          console.log("CHANNEL DATA");
          console.log(data.channels[0].channel_id);
          const channelData = data.channels[0];
          console.log(channelData);
          setActiveChannelId(data.channels[0].channel_id);
        }
        // --- DISCOVERY & CHANNEL LOGIC ---
        // (remains the same as your provided code)
      };

      ws.onclose = () => {
        setStatus("disconnected");
        setLoading(false);
        addLog("🔌 Disconnected from Clearnode");
      };
    } catch (error: any) {
      addLog(`❌ Connection Failed: ${error.message}`);
      setStatus("disconnected");
      setLoading(false);
    }
  }, [address, walletClient, status]);

  // --- PUBLIC: Connect Function ---
  const connect = useCallback(async () => {
    // 1. If Wallet NOT Connected: Open Modal
    if (!isConnected || !address || !walletClient) {
      addLog("⚠️ Wallet required. Opening modal...");
      setPendingYellowConnection(true); // Flag to retry later
      await open();
      return;
    }

    // 2. If Wallet IS Connected: Start Engine
    await executeYellowConnection();
  }, [isConnected, address, walletClient, open, executeYellowConnection]);

  /**
   * Triggers the EIP-712 signature request to authorize the L3 session.
   * This should be called manually from the Onboarding Modal.
   */
  const requestSignature = useCallback(async () => {
    if (!address || !walletClient || !wsRef.current) {
      addLog("❌ Cannot sign: Wallet or Connection not ready.");
      return;
    }

    try {
      setStatus("authenticating");
      addLog("✍️ Requesting signature from wallet...");

      const { session_key, allowances, expires_at, scope } =
        authParamsRef.current;

      // 1. Create the EIP-712 Signer
      const signer = createEIP712AuthMessageSigner(
        walletClient,
        {
          session_key,
          allowances,
          expires_at,
          scope,
        },
        { name: "Haki" },
      );

      // 2. We need the challenge message.
      // Usually, the Clearnode sends this in the 'auth_challenge' message.
      // We'll store it in a Ref or State when it arrives in ws.onmessage.
      if (!lastChallengeRef.current) {
        addLog("❌ No active challenge from node. Try reconnecting.");
        return;
      }

      const verifyMsg = await createAuthVerifyMessageFromChallenge(
        signer,
        lastChallengeRef.current,
      );

      // 3. Send the verification back to the Clearnode
      wsRef.current.send(verifyMsg);
      addLog("🚀 Verification sent! Awaiting JWT...");
    } catch (error) {
      console.error("Signature failed:", error);
      addLog("❌ Signature rejected or failed.");
      setStatus("disconnected");
      setLoading(false);
    }
  }, [address, walletClient, addLog]);

  // --- EFFECT: Handle Pending Connection ---
  // Triggers ONLY if user clicked 'connect' previously and just finished connecting wallet
  useEffect(() => {
    if (pendingYellowConnection && isConnected && address && walletClient) {
      addLog("🔗 Wallet connected! Resuming Yellow...");
      setPendingYellowConnection(false);
      executeYellowConnection();
    }
  }, [
    pendingYellowConnection,
    isConnected,
    address,
    walletClient,
    executeYellowConnection,
  ]);

  useEffect(() => {
    console.log("YELLOW", status);
  }, [status]);

  return (
    <YellowContext.Provider
      value={{
        ws: wsRef.current,
        status,
        jwt,
        activeChannelId,
        logs,
        connect,
        requestSignature,
        sendMessage,
        client: clientRef.current,
        sessionSigner: sessionSignerRef.current,
        loading,
        setLoading,
      }}
    >
      {children}
    </YellowContext.Provider>
  );
}

export function useYellow() {
  const context = useContext(YellowContext);
  if (!context) throw new Error("useYellow must be used within YellowProvider");
  return context;
}
