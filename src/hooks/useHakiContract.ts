import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContracts,
} from "wagmi";
import { keccak256, encodePacked, namehash } from "viem";
import { HAKI_ABI } from "../utils/abis/Haki";
import { PUBLIC_RESOLVER_ABI } from "../utils/abis/PublicResolver";
import { HAKI_ADDRESS } from "@/utils/consts";
import { useCallback, useEffect } from "react";
import { ResolutionStrategy } from "@/app/create/page";

const RESOLVER_ADDRESS = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5";
const PARENT_NODE = namehash("haki-pm.eth");

export function useHakiContract(label?: string) {
  const subnode = label
    ? keccak256(
        encodePacked(
          ["bytes32", "bytes32"],
          [PARENT_NODE, keccak256(encodePacked(["string"], [label]))],
        ),
      )
    : null;

  // --- MERGED READ QUERIES ---
  const {
    data,
    isLoading: isReadLoading,
    refetch: refetchMarket,
  } = useReadContracts({
    contracts: [
      {
        address: HAKI_ADDRESS,
        abi: HAKI_ABI,
        functionName: "markets",
        args: subnode ? [subnode] : undefined,
      },
      {
        address: RESOLVER_ADDRESS,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: "text",
        args: subnode ? [subnode, "description"] : undefined,
      },
      {
        address: RESOLVER_ADDRESS,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: "text",
        args: subnode ? [subnode, "options"] : undefined,
      },
    ],
    query: {
      enabled: !!subnode,
      // Keep data "fresh" for 5 minutes.
      // During this time, no new network requests will be made for this label.
      staleTime: 1_000 * 60 * 5,
      // Keep the data in the cache for 30 minutes even if no components are using it.
      gcTime: 1_000 * 60 * 30,
    },
  });

  // Extract results safely
  const [marketResult, descriptionResult, optionsResult] = data || [];
  const marketMapping = marketResult?.result as unknown as any[];
  const description = descriptionResult?.result as string;
  const options = optionsResult?.result as string;

  // --- WRITE LOGIC ---
  const {
    data: hash,
    writeContract,
    isPending: isWritePending,
    error: writeError,
    variables,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });

  const createMarket = (
    label: string,
    description: string,
    options: string,
    expiry: number,
    liquidityB: number,
    resolutionStrategy: ResolutionStrategy,
  ) => {
    console.log(liquidityB, resolutionStrategy);
    writeContract({
      address: HAKI_ADDRESS,
      abi: HAKI_ABI,
      functionName: "createMarket",
      args: [
        label,
        description,
        options,
        BigInt(expiry),
        BigInt(liquidityB),
        resolutionStrategy,
      ],
    });
  };

  

  const syncMarketToDb = useCallback(async () => {
    if (!isSuccess || !variables) return;

    // Extract original inputs from the writeContract variables
    const [
      marketLabel,
      marketDescription,
      marketOptions,
      liquidityB,
      resolutionStrategy,
    ] = variables.args as [string, string, string, bigint, string];

    try {
      const response = await fetch("/api/market/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          {
            wallet: "0xtest",
            marketLabel,
            marketDescription,
            options: marketOptions,
            b: liquidityB, // This is a BigInt
            resolution_type: resolutionStrategy,
          },
          (key, value) =>
            // This 'replacer' function handles the BigInt conversion
            typeof value === "bigint" ? value.toString() : value,
        ),
      });

      if (!response.ok) throw new Error("Failed to sync with DB");
      console.log("🚀 Market successfully synced to Supabase");
    } catch (err) {
      console.error("❌ DB Sync Error:", err);
    }
  }, [isSuccess, variables]);

  useEffect(() => {
    if (isSuccess) {
      syncMarketToDb();
    }
  }, [isSuccess, syncMarketToDb]);
  // Format the market data for the UI
  const market = marketMapping
    ? {
        creator: marketMapping[0],
        resultTimestamp: Number(marketMapping[1]),
        stateRoot: marketMapping[2],
        resolved: marketMapping[3],
        challenged: marketMapping[4],
        label: marketMapping[5],
        expiry: Number(marketMapping[6]),
        description: description || "",
        options: options ? options.split(",") : [], // Convert comma string back to Array
      }
    : null;

  return {
    createMarket,
    refetchMarket,
    market,
    subnode,
    isLoading: isWritePending || isConfirming || isReadLoading,
    isSuccess,
    error: writeError || confirmError,
    hash,
    syncMarketToDb,
  };
}
