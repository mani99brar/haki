import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useAccount } from "wagmi"; // To get the user's wallet

interface MarketOption {
  option_id: string;
  label: string;
  marginal_price: number;
  shares: number;
  probability: number;
}

interface UserPosition {
  option_id: string;
  shares: number;
}

interface MarketState {
  marketId: string | null;
  b: number | null;
  resolution_type: string | null;
  options: MarketOption[];
  userPositions: UserPosition[]; // Added user positions
  preview: {
    cost: number | null;
    avgPrice: number | null;
  };
  isLoading: boolean;
  isOptionsLoading: boolean;
  isUserLoading: boolean; // Tracking user data specifically
  error: string | null;
  volume: number;
}

export function useMarketData(
  marketLabel: string | null,
  selectedOutcome: string | null,
  shares: number,
) {
  const { address: wallet } = useAccount();
  const [resolvedMarketId, setResolvedMarketId] = useState<string | null>(null);
  const [marketOptions, setMarketOptions] = useState<any[]>([]);

  const [state, setState] = useState<MarketState>({
    marketId: null,
    b: null,
    resolution_type: null,
    options: [],
    userPositions: [],
    preview: { cost: null, avgPrice: null },
    isLoading: false,
    isOptionsLoading: false,
    isUserLoading: false,
    error: null,
    volume: 0,
  });

  const debouncedShares = useDebounce(shares, 300);

  // --- 1. Fetch Market Options ---
  const fetchMarketInfo = useCallback(async () => {
    if (!marketLabel) return;
    setState((prev) => ({ ...prev, isOptionsLoading: true }));
    try {
      const response = await fetch("/api/market/get-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketLabel }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setResolvedMarketId(data.marketId);
      setMarketOptions(data.options);

      setState((prev) => ({
        ...prev,
        marketId: data.marketId,
        b: data.b,
        resolution_type: data.resolution_type,
        options: [...data.options], // 🔥 Force new array reference for React re-render
        isOptionsLoading: false,
        volume: data.volume,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.message,
        isOptionsLoading: false,
      }));
    }
  }, [marketLabel]);

  // --- 2. Fetch User Specific Data (Positions) ---
  const fetchUserPositions = useCallback(async () => {
    if (!wallet || !resolvedMarketId) return;

    setState((prev) => ({ ...prev, isUserLoading: true }));
    try {
      const response = await fetch("/api/user/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, marketId: resolvedMarketId }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setState((prev) => ({
        ...prev,
        userPositions: [...data.positions], // 🔥 Force new array reference
        isUserLoading: false,
      }));
    } catch (err: any) {
      console.error("❌ User Positions Error:", err.message);
      setState((prev) => ({ ...prev, isUserLoading: false }));
    }
  }, [wallet, resolvedMarketId]);

  // --- 3. Fetch Trade Preview ---
  const fetchPreview = useCallback(async () => {
    const selectedOptionRow = marketOptions.find(
      (opt) => opt.label === selectedOutcome,
    );
    const sharesNum = Number(debouncedShares);

    if (
      !resolvedMarketId ||
      !selectedOptionRow ||
      isNaN(sharesNum) ||
      sharesNum <= 0
    ) {
      setState((prev) => ({
        ...prev,
        preview: { cost: null, avgPrice: null },
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch("/api/market/preview-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: resolvedMarketId,
          optionId: selectedOptionRow.option_id,
          shares: sharesNum,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setState((prev) => ({
        ...prev,
        preview: { cost: data.cost, avgPrice: data.avgPrice },
        isLoading: false,
      }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err.message, isLoading: false }));
    }
  }, [resolvedMarketId, marketOptions, selectedOutcome, debouncedShares]);

  // Effects for synchronization
  useEffect(() => {
    fetchMarketInfo();
  }, [fetchMarketInfo]);
  useEffect(() => {
    fetchUserPositions();
  }, [fetchUserPositions]);
  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const refresh = useCallback(async () => {
    // Run both fetches in parallel
    await Promise.all([fetchMarketInfo(), fetchUserPositions()]);
  }, [fetchMarketInfo, fetchUserPositions]);

  return { ...state, refresh };
}
