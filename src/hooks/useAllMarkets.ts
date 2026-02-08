import { usePublicClient } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { parseAbiItem } from "viem";
import { HAKI_ADDRESS } from "@/utils/consts";
const DEPLOY_BLOCK = BigInt(10204130);
const BLOCK_STEP = BigInt(10000); // Adjust based on your RPC's limits

export function useAllMarkets() {
  const [marketLabels, setMarketLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFromBlock, setCurrentFromBlock] = useState(DEPLOY_BLOCK);
  const [latestBlock, setLatestBlock] = useState<bigint | null>(null);
  const [markets, setMarkets] = useState<
    { label: string; creator: string; node: string }[]
  >([]);
  const publicClient = usePublicClient();

  // 1. Get the current latest block height on mount
  useEffect(() => {
    const getLatest = async () => {
      if (publicClient) {
        const block = await publicClient.getBlockNumber();
        setLatestBlock(block);
      }
    };
    getLatest();
  }, [publicClient]);

  const fetchLogs = useCallback(
    async (from: bigint) => {
      if (!publicClient) return;
      setIsLoading(true);

      try {
        // Calculate toBlock, ensuring we don't exceed the actual tip of the chain
        let toBlock = from + BLOCK_STEP;
        if (latestBlock && toBlock > latestBlock) toBlock = latestBlock;

        const logs = await publicClient.getLogs({
          address: HAKI_ADDRESS,
          event: parseAbiItem(
            "event MarketCreated(bytes32 indexed node, address indexed creator, string label)",
          ),
          fromBlock: from,
          toBlock: toBlock,
        });
        const newMarkets = logs.map((log) => ({
          label: log.args.label as string,
          creator: log.args.creator as string,
          node: log.args.node as string,
        }));
        setMarkets((prev) => {
          const combined = [...prev, ...newMarkets];
          // Filter unique nodes to avoid duplicates on refetch
          return combined.filter(
            (v, i, a) => a.findIndex((t) => t.node === v.node) === i,
          );
        });

        const labels = logs.map((log) => log.args.label as string);

        // We overwrite labels per page, or use [...prev, ...labels] to append
        setMarketLabels(labels);
      } catch (error) {
        console.error("Failed to fetch market logs:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [publicClient, latestBlock],
  );

  // Refetch whenever the starting block changes
  useEffect(() => {
    if (latestBlock) fetchLogs(currentFromBlock);
  }, [currentFromBlock, latestBlock, fetchLogs]);

  const nextPage = () => {
    if (latestBlock && currentFromBlock + BLOCK_STEP < latestBlock) {
      setCurrentFromBlock((prev) => prev + BLOCK_STEP);
    }
  };

  const prevPage = () => {
    if (currentFromBlock - BLOCK_STEP >= DEPLOY_BLOCK) {
      setCurrentFromBlock((prev) => prev - BLOCK_STEP);
    } else {
      setCurrentFromBlock(DEPLOY_BLOCK);
    }
  };

  return {
    markets,
    marketLabels,
    isLoading,
    nextPage,
    prevPage,
    currentRange: {
      from: currentFromBlock,
      to:
        currentFromBlock + BLOCK_STEP > (latestBlock || BigInt(0))
          ? latestBlock
          : currentFromBlock + BLOCK_STEP,
    },
    isAtEnd: latestBlock ? currentFromBlock + BLOCK_STEP >= latestBlock : false,
  };
}
