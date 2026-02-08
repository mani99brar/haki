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
import {
  Hex,
  createWalletClient,
  custom,
  createPublicClient,
  http,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount, useWalletClient } from "wagmi";
import { sepolia } from "viem/chains";
import {
  createECDSAMessageSigner,
  createAuthRequestMessage,
  createEIP712AuthMessageSigner,
  createAuthVerifyMessageFromChallenge,
  createAuthVerifyMessageWithJWT,
  NitroliteClient,
  WalletStateSigner,
} from "@erc7824/nitrolite";

// --- Configuration ---
const CLEARNODE_URL = "wss://clearnet-sandbox.yellow.com/ws";
const STORAGE_KEY_SK = "yellow_session_sk";
const STORAGE_KEY_JWT = "yellow_jwt";

export type YellowStatus =
  | "disconnected"
  | "connecting"
  | "waiting-signature"
  | "connected";

interface YellowContextType {
  status: YellowStatus;
  activeChannelId: string | null;
  // Actions
  connect: () => void;
  disconnect: () => void;
  signSession: () => Promise<void>;
  sendMessage: (msg: string) => void;
  // Data
  client: NitroliteClient | null;
  sessionSigner: any;
  jwt: string | null;
  ws: WebSocket | null;
}

const YellowContext = createContext<YellowContextType | undefined>(undefined);

export function YellowProvider({ children }: { children: ReactNode }) {
  // --- Global State ---
  const [status, setStatus] = useState<YellowStatus>("disconnected");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);

  // --- Refs (Mutable data that doesn't trigger re-renders) ---
  const wsRef = useRef<WebSocket | null>(null);
  const clientRef = useRef<NitroliteClient | null>(null);
  const sessionSignerRef = useRef<any>(null);

  // Auth Refs
  const latestChallengeRef = useRef<string | null>(null);
  const authParamsRef = useRef<any>(null);

  // --- Wallet Hooks ---
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // --- 1. Session Key Initialization (Run Once) ---
  useEffect(() => {
    let sessionKey = localStorage.getItem(STORAGE_KEY_SK) as Hex | null;
    if (!sessionKey) {
      sessionKey = generatePrivateKey();
      localStorage.setItem(STORAGE_KEY_SK, sessionKey);
    }
    // Create the generic signer for the session key
    sessionSignerRef.current = createECDSAMessageSigner(sessionKey);
  }, []);

  // --- 2. Message Sender Helper ---
  const sendMessage = useCallback((msg: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("⬆️ SEND:", JSON.parse(msg)); // Debug Log
      wsRef.current.send(msg);
    } else {
      console.warn("⚠️ WebSocket not ready. Message dropped.");
    }
  }, []);

  // --- 3. The Core Connection Logic ---
  const executeConnection = useCallback(async () => {
    // Guards
    if (!address || !walletClient || !sessionSignerRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");

    // A. Setup Nitrolite SDK
    try {
      const vPublicClient = createPublicClient({
        chain: sepolia,
        transport: http("https://1rpc.io/sepolia"),
      });

      // We wrap the wagmi walletClient in a viem client for consistency
      const vWalletClient = createWalletClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
        account: address,
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

      // B. WebSocket Setup
      const ws = new WebSocket(CLEARNODE_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("🔌 WS Open");

        // Prepare Auth Params
        const sessionKeyHex = localStorage.getItem(STORAGE_KEY_SK) as Hex;
        const sessionAccount = privateKeyToAccount(sessionKeyHex);

        const params = {
          address: address,
          application: "Haki",
          session_key: sessionAccount.address,
          allowances: [{ asset: "ytest.usd", amount: "1000000000000000000" }],
          expires_at: BigInt(Math.floor(Date.now() / 1000) + 36000),
          scope: "test.app",
        };
        authParamsRef.current = params;

        // Send Auth Request
        const authMsg = await createAuthRequestMessage(params);
        ws.send(authMsg);
      };

      ws.onmessage = async (event) => {
        const response = JSON.parse(event.data.toString());
        console.log("⬇️ RECV:", response);

        // Handle Errors (Like Invalid Token)
        if (response.error) {
          if (
            response.error.code === 4001 ||
            response.error.message?.includes("token")
          ) {
            console.warn("⚠️ Invalid JWT. Clearing and requiring re-sign.");
            localStorage.removeItem(STORAGE_KEY_JWT + address);
            setJwt(null);
            // We don't close socket, the clearnode will likely send a challenge next
          }
          return;
        }

        const type = response.res?.[1];
        const data = response.res?.[2];

        // --- Scenario A: Clearnode asks for Proof (Challenge) ---
        if (type === "auth_challenge") {
          latestChallengeRef.current = data.challenge_message;

          // 1. Try to use stored JWT first
          const storedJwt = localStorage.getItem(STORAGE_KEY_JWT + address);
          if (storedJwt) {
            console.log("🔑 Using stored JWT...");
            try {
              const verifyMsg = await createAuthVerifyMessageWithJWT(storedJwt);
              ws.send(verifyMsg);
              return; // We sent the JWT, wait for 'auth_verify'
            } catch (err) {
              console.error("JWT creation failed", err);
            }
          }

          // 2. If no JWT (or failed), we must wait for user signature
          console.log("📝 No JWT found. Waiting for signature...");
          setStatus("waiting-signature");
        }

        // --- Scenario B: Auth Success ---
        if (type === "auth_verify") {
          const newJwt = data.jwt_token;
          if (newJwt) {
            setJwt(newJwt);
            localStorage.setItem(STORAGE_KEY_JWT + address, newJwt);
          }
          setStatus("connected");
          console.log("✅ Connected to Yellow Network");
        }

        // --- Scenario C: Channels Data ---
        if (type === "channels") {
          if (data.channels && data.channels.length > 0) {
            setActiveChannelId(data.channels[0].channel_id);
          }
        }

        if (type === "create_channel") {
          setActiveChannelId(data.channel_id);
        }
      };

      ws.onclose = (event) => {
        console.log("🔌 WS Closed", event.code);
        wsRef.current = null; // Clear ref
        setStatus("disconnected");
      };

      ws.onerror = (err) => {
        console.error("❌ WS Error", err);
        // onError usually triggers onClose immediately after
      };
    } catch (err) {
      console.error("Setup Failed", err);
      setStatus("disconnected");
    }
  }, [address, walletClient]);

  // --- 4. User Action: Sign Session ---
  // Called when status is 'waiting-signature'
  const signSession = useCallback(async () => {
    if (
      !walletClient ||
      !wsRef.current ||
      !latestChallengeRef.current ||
      !authParamsRef.current
    )
      return;

    try {
      const { session_key, allowances, expires_at, scope } =
        authParamsRef.current;

      const signer = createEIP712AuthMessageSigner(
        walletClient,
        { session_key, allowances, expires_at, scope },
        { name: "Haki" },
      );

      const verifyMsg = await createAuthVerifyMessageFromChallenge(
        signer,
        latestChallengeRef.current,
      );

      wsRef.current.send(verifyMsg);
      // Status remains 'waiting-signature' until 'auth_verify' message comes back
    } catch (err) {
      console.error("Signature rejected", err);
    }
  }, [walletClient]);

  // --- 5. Auto-Connect Effect ---
  // Replaces YellowConnectionManager
  useEffect(() => {
    // Only auto-connect if:
    // 1. Wallet is connected
    // 2. We are currently disconnected
    // 3. We have the walletClient ready
    if (isConnected && address && walletClient && status === "disconnected") {
      executeConnection();
    }

    // Cleanup on unmount or account change
    return () => {
      if (!isConnected && wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isConnected, address, walletClient, status, executeConnection]);

  // --- 6. Explicit Disconnect ---
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setStatus("disconnected");
    setActiveChannelId(null);
    setJwt(null);
  }, []);

  return (
    <YellowContext.Provider
      value={{
        status,
        activeChannelId,
        connect: executeConnection, // Manual retry
        disconnect,
        signSession,
        sendMessage,
        client: clientRef.current,
        sessionSigner: sessionSignerRef.current,
        jwt,
        ws: wsRef.current,
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
