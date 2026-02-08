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
import { Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount, useWalletClient } from "wagmi";
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
  connect: () => Promise<void>;
  requestSignature: () => Promise<void>;
  sendMessage: (msg: string) => void;
  client: NitroliteClient | null;
  sessionSigner: any;
  loading: boolean;
  setLoading: (val: boolean) => void;
  pendingChannelData: any;
}

const YellowContext = createContext<YellowContextType | undefined>(undefined);

export function YellowProvider({ children }: { children: ReactNode }) {
  // Global State
  const [status, setStatus] =
    useState<YellowContextType["status"]>("disconnected");
  const [jwt, setJwt] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [pendingYellowConnection, setPendingYellowConnection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingChannelData, setPendingChannelData] = useState<any>();
  const lastChallengeRef = useRef<string | null>(null);
  const authParamsRef = useRef<any>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const sessionSignerRef = useRef<any>(null);
  const clientRef = useRef<NitroliteClient | null>(null);

  // Wallet Hooks
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

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
      return;
    }

    if (
      status !== "disconnected" &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    setStatus("authenticating");

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
      }
      const sessionAccount = privateKeyToAccount(sessionKey);
      sessionSignerRef.current = createECDSAMessageSigner(sessionKey);

      // 3. Setup WebSocket
      const ws = new WebSocket(CLEARNODE_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
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
      };

      ws.onmessage = async (event) => {
        const response = JSON.parse(event.data.toString());
        console.log(response);
        if (response.error) {
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
            console.log(
              "JWT verification failed, falling back to manual auth flow",
              e,
            );
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
          setStatus("connected");
        }

        if (type === "channels") {
          console.log("CHANNEL full DATA", data);
          const channelData = data.channels[0];
          console.log("CHANNEL DATA", channelData);
          setActiveChannelId(data.channels[0].channel_id);
        }
        if (type === "create_channel") {
          const channel = {
            participants: (data.channel.participants || []).map(
              (p: string) => p as `0x${string}`,
            ),
            adjudicator: data.channel.adjudicator as `0x${string}`,
            challenge: BigInt(data.channel.challenge || 3600),
            nonce: BigInt(data.channel.nonce),
          };

          // 2. Defensively map Initial State
          const unsignedInitialState: any = {
            intent: BigInt(data.state.intent || 1),
            version: BigInt(data.state.version || 0),
            // Use 'data' for the property name as required by the TS error earlier
            data: data.state.state_data || "0x",
            allocations: (data.state.allocations || []).map((a: any) => {
              // ENSURE NO UNDEFINED VALUES HERE
              if (!a.asset || !a.destination) {
                console.error("🚨 Found malformed allocation:", a);
              }
              return {
                asset: (a.asset ||
                  "0x0000000000000000000000000000000000000000") as `0x${string}`,
                destination: (a.destination ||
                  "0x0000000000000000000000000000000000000000") as `0x${string}`,
                amount: BigInt(a.amount || 0),
              };
            }),
          };

          // DEBUG LOG: Check for any 'undefined' strings in this output
          console.log("🛠️ FINAL OBJECT CHECK:", {
            channel,
            unsignedInitialState,
          });

          // 2. Log to verify before sending
          console.log("🚀 Prepared State for SDK:", unsignedInitialState);
          const createResult = await clientRef.current?.createChannel({
            channel,
            unsignedInitialState,
            serverSignature: data.server_signature as `0x${string}`,
          });
          console.log(createResult);
          // Store the full response data so the Onboarding Manager can grab it
          setPendingChannelData(data);
          setActiveChannelId(data.channel_id);
        }

        // --- DISCOVERY & CHANNEL LOGIC ---
        // (remains the same as your provided code)
      };

      ws.onclose = () => {
        setStatus("disconnected");
        setLoading(false);
      };
    } catch (error: any) {
      console.error("Connection failed:", error);
      setStatus("disconnected");
      setLoading(false);
    }
  }, [address, walletClient, status]);

  // --- PUBLIC: Connect Function ---
  const connect = useCallback(async () => {
    // 1. If Wallet NOT Connected: Open Modal
    if (!isConnected || !address || !walletClient) {
      setPendingYellowConnection(true); // Flag to retry later
      return;
    }

    // 2. If Wallet IS Connected: Start Engine
    await executeYellowConnection();
  }, [isConnected, address, walletClient, executeYellowConnection]);

  /**
   * Triggers the EIP-712 signature request to authorize the L3 session.
   * This should be called manually from the Onboarding Modal.
   */
  const requestSignature = useCallback(async () => {
    if (!address || !walletClient || !wsRef.current) {
      return;
    }

    try {
      setStatus("authenticating");

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
        return;
      }

      const verifyMsg = await createAuthVerifyMessageFromChallenge(
        signer,
        lastChallengeRef.current,
      );

      // 3. Send the verification back to the Clearnode
      wsRef.current.send(verifyMsg);
    } catch (error) {
      console.error("Signature failed:", error);
      setStatus("disconnected");
      setLoading(false);
    }
  }, [address, walletClient]);

  // --- EFFECT: Handle Pending Connection ---
  // Triggers ONLY if user clicked 'connect' previously and just finished connecting wallet
  useEffect(() => {
    if (pendingYellowConnection && isConnected && address && walletClient) {
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
        connect,
        requestSignature,
        sendMessage,
        client: clientRef.current,
        sessionSigner: sessionSignerRef.current,
        loading,
        setLoading,
        pendingChannelData,
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
