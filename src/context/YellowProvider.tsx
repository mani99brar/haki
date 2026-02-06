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
  NitroliteClient,
  WalletStateSigner,
} from "@erc7824/nitrolite";
import { createWalletClient, custom, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

// --- Configuration ---
const CLEARNODE_URL = "wss://clearnet-sandbox.yellow.com/ws";
const STORAGE_KEY_SK = "yellow_session_sk";
const STORAGE_KEY_JWT = "yellow_jwt";

interface YellowContextType {
  ws: WebSocket | null;
  status: "disconnected" | "authenticating" | "connected" | "active";
  jwt: string | null;
  activeChannelId: string | null;
  logs: string[];
  connect: () => Promise<void>;
  sendMessage: (msg: string) => void;
  client: NitroliteClient | null;
  sessionSigner: any;
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
      // Already connected, don't restart
      return;
    }

    setStatus("authenticating");
    addLog("🔌 Connecting to Yellow Network...");

    try {
      // 1. Initialize SDK
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

      // 2. Load Session Key (Reuse if exists!)
      let sessionKey = localStorage.getItem(STORAGE_KEY_SK) as Hex | null;
      if (!sessionKey) {
        sessionKey = generatePrivateKey();
        localStorage.setItem(STORAGE_KEY_SK, sessionKey);
        addLog("🔑 Created new Session Key");
      } else {
        addLog("📂 Loaded existing Session Key");
      }

      const sessionAccount = privateKeyToAccount(sessionKey);
      sessionSignerRef.current = createECDSAMessageSigner(sessionKey);

      // 3. Load JWT (if exists)
      const storedJwt = localStorage.getItem(STORAGE_KEY_JWT);
      if (storedJwt) {
        setJwt(storedJwt);
        addLog("🎟️ Found stored JWT");
      }

      // 4. Connect WebSocket
      const ws = new WebSocket(CLEARNODE_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
        addLog("🔐 Sending Auth Request...");

        // We always send auth_request. If the Session Key is still valid on the Node,
        // the Node might accept it without challenging the Wallet again.
        const authMsg = await createAuthRequestMessage({
          address: address,
          application: "Haki",
          session_key: sessionAccount.address,
          allowances: [{ asset: "ytest.usd", amount: "1000000000" }],
          expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
          scope: "test.app",
        });
        ws.send(authMsg);
      };

      ws.onmessage = async (event) => {
        const response = JSON.parse(event.data.toString());
        console.log(response);
        if (response.error) {
          // Special handling: if Session Key is expired/invalid, maybe clear it?
          addLog(`❌ Error: ${response.error.message}`);
          return;
        }

        const type = response.res?.[1];
        const data = response.res?.[2];

        // --- AUTH CHALLENGE (User Signature Required) ---
        if (type === "auth_challenge") {
          addLog("✍️ Session check failed/expired. Please sign in Wallet...");
          try {
            const signer = createEIP712AuthMessageSigner(
              vWalletClient,
              {
                session_key: sessionAccount.address,
                allowances: [{ asset: "ytest.usd", amount: "1000000000" }],
                expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
                scope: "test.app",
              },
              { name: "Haki" },
            );

            const verifyMsg = await createAuthVerifyMessageFromChallenge(
              signer,
              data.challenge_message,
            );
            ws.send(verifyMsg);
          } catch (e) {
            console.error(e);
            addLog("❌ Signature rejected");
            ws.close();
            setStatus("disconnected");
          }
        }

        // --- AUTH SUCCESS ---
        if (type === "auth_verify") {
          const newJwt = data.token || data.jwt;
          if (newJwt) {
            setJwt(newJwt);
            localStorage.setItem(STORAGE_KEY_JWT, newJwt);
          }
          addLog("✅ Authenticated!");
          setStatus("connected");
        }

        // --- DISCOVERY ---
        if (type === "channels") {
          const channels = data.channels || [];
          const openChannel = channels.find((c: any) => c.status === "open");
          if (openChannel) {
            setActiveChannelId(openChannel.channel_id);
            setStatus("active");
            addLog(`📂 Active Channel: ${openChannel.channel_id}`);
          }
        }

        if (type === "create_channel") {
          setActiveChannelId(data.channel_id);
          addLog("📦 Channel Created");
        }
      };

      ws.onclose = () => {
        setStatus("disconnected");
        addLog("🔌 Disconnected");
      };
    } catch (error: any) {
      addLog(`❌ Connection Failed: ${error.message}`);
      setStatus("disconnected");
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

  return (
    <YellowContext.Provider
      value={{
        ws: wsRef.current,
        status,
        jwt,
        activeChannelId,
        logs,
        connect,
        sendMessage,
        client: clientRef.current,
        sessionSigner: sessionSignerRef.current,
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
