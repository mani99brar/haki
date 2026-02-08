"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import "./market.css";
import { useHakiContract } from "@/hooks/useHakiContract";
import { useYellowTrade } from "@/hooks/yellow/useYellowTrade";
import { useMarketData } from "@/hooks/useMarketTradePreview";
import { useNotification } from "@/context/NotificationContext";
import { useAppKitAccount } from "@reown/appkit/react";
import { Address, zeroHash } from "viem";
import { useYellowActions } from "@/hooks/yellow/useYellowActions";

interface MarketOption {
  id: string;
  option_id: string;
  name: string;
  label: string;
  probability: number;
  current_price: number;
  shares: number;
  userShares: number;
}

export default function MarketPage() {
  const lastNotifiedMessage = useRef("");
  const lastNotifiedError = useRef("");
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // State
  const [betAmounts, setBetAmounts] = useState<{ [key: string]: string }>({});
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [winningOptionId, setWinningOptionId] = useState<string>("");
  const [justification, setJustification] = useState<string>("");

  // Hooks
  const { placeBet, isTrading, sellShares, message, error } = useYellowTrade();
  const currentAmount = parseFloat(betAmounts[selectedOutcome || ""] || "0");
  const state = useMarketData(id, selectedOutcome, currentAmount);
  const { showNotification } = useNotification();
  const { resolveCreatorMarket, resolvePublicMarket, market, isLoading } =
    useHakiContract(id);
  const { address } = useAppKitAccount();
  const { balance, refreshBalance } = useYellowActions(address as Address);

  // --- Notification Logic ---
  useEffect(() => {
    refreshBalance();
    if (isTrading) {
      lastNotifiedMessage.current = "";
      lastNotifiedError.current = "";
      return;
    }
    if (error && error !== "") {
      if (error !== lastNotifiedError.current) {
        showNotification(error, "error");
        lastNotifiedError.current = error;
      }
    }
    if (message && message !== "") {
      if (message !== lastNotifiedMessage.current) {
        showNotification(message, "success");
        lastNotifiedMessage.current = message;
        setTimeout(() => {
          state.refresh();
        }, 800);
      }
    }
  }, [isTrading, message, error, showNotification, state]);

  // --- Handlers ---
  const handleBetAmountChange = (outcomeId: string, value: string) => {
    setBetAmounts({ ...betAmounts, [outcomeId]: value });
    if (selectedOutcome !== outcomeId) {
      setSelectedOutcome(outcomeId);
    }
  };

  const handleResolve = async () => {
    if (!winningOptionId) {
      showNotification("Please select a winning outcome", "error");
      return;
    }
    try {
      await resolveCreatorMarket(
        state?.marketId!,
        winningOptionId,
        market?.label || "",
        justification,
      );
      showNotification("Market resolution submitted!", "success");
    } catch (err) {
      console.error("❌ Resolution error:", err);
      showNotification("Resolution failed", "error");
    }
  };

  const handlePublicResolve = async () => {
    try {
      await resolvePublicMarket(state?.marketId!, id);
      showNotification("Market resolution submitted!", "success");
    } catch (err) {
      console.error("❌ Resolution error:", err);
      showNotification("Resolution failed", "error");
    }
  };

  // --- Derived State ---

  // 1. Expiry Check
  const isExpired = useMemo(() => {
    if (!market?.expiry) return false;
    return Date.now() / 1000 > market.expiry;
  }, [market?.expiry]);

  // 2. Pending Result Check (State Root exists but not resolved)
  const hasResultPending = useMemo(() => {
    return (
      market?.stateRoot && market.stateRoot !== zeroHash && !market.resolved
    );
  }, [market?.stateRoot, market?.resolved]);

  // 3. Winning Label Helper
  const winningLabel = market?.winningOption;

  // 4. Status Logic (Strictly following your rules)
  const marketStatus = useMemo(() => {
    if (!market) return { label: "Loading", className: "loading" };

    if (market.resolved) {
      return { label: "Resolved", className: "resolved" };
    }

    if (isExpired) {
      if (hasResultPending) {
        // Expired + State Root present + Not Resolved = Settling
        return { label: "Settling", className: "settling" };
      }
      // Expired + No State Root = Resolving (Needs input)
      return { label: "Resolving", className: "resolving" };
    }

    return { label: "Open", className: "open" };
  }, [market, isExpired, hasResultPending]);

  // Options Mapping
  const marketOptions: MarketOption[] = useMemo(() => {
    if (!state.options || state.options.length === 0) return [];
    return state.options.map((option, index) => {
      const userPos = state.userPositions?.find(
        (p) => p.option_id === option.option_id,
      );
      return {
        id: index.toString(),
        option_id: option.option_id,
        name: option.label,
        label: option.label,
        probability: option.probability,
        current_price: option.marginal_price || 0,
        shares: option.shares,
        userShares: userPos ? userPos.shares : 0,
      };
    });
  }, [state.options, state.userPositions]);

  // Time Remaining
  const timeRemaining = useMemo(() => {
    if (!market?.expiry) return "No expiry set";
    const now = Date.now() / 1000;
    const diff = market.expiry - now;
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }, [market?.expiry]);

  // Trading Handlers
  const handleBuy = (optionId: string, amount: string) => {
    console.log("🎯 BUY", { marketId: id, optionId, amount });

    if (state.preview.cost == null || state.marketId == null) {
      showNotification(
        "Invalid market state or insufficient liquidity calc",
        "error",
      );
      return;
    }
    if (balance != null && Number(balance) < state.preview.cost) {
      showNotification("Insufficient balance to place bet", "error");
      return;
    }
    placeBet(
      state.preview.cost.toString(),
      state.marketId!,
      optionId,
      currentAmount,
    );
  };

  const handleSell = (optionId: string, shares: number) => {
    if (state.marketId == null) return;
    sellShares("0", state.marketId, optionId, shares);
  };

  const truncateAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="market-container">
          <div className="loading-state">
            <div className="loading-spinner">⟳</div>
            <p>Loading market data...</p>
          </div>
        </div>
      </>
    );
  }

  if (!market) {
    return (
      <>
        <Navigation />
        <div className="market-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Market Not Found</h2>
            <button onClick={() => router.push("/")} className="back-btn">
              ← Back to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />

      <div className="market-container">
        {/* Header */}
        <div className="market-header">
          <div className="market-header-content">
            <div className="market-breadcrumb">
              <button
                onClick={() => router.push("/")}
                className="breadcrumb-link"
              >
                Home
              </button>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">{market.label}</span>
            </div>

            <div className="market-title-row">
              <h1 className="market-question">
                <a
                  href={`https://sepolia.app.ens.domains/${market.label}.haki-o.eth`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ens-link"
                >
                  {market.label}.haki-o.eth
                </a>
              </h1>
              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <span
                  className={`market-tag res-type ${market?.resolutionType?.toLowerCase()}`}
                >
                  {market?.resolutionType?.toLowerCase() === "creator"
                    ? "👤"
                    : "🤖"}
                  Resolution: {market?.resolutionType || "Standard"}
                </span>
                <div
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(0, 212, 170, 0.15)",
                    color: "var(--accent-teal)",
                    border: "1px solid rgba(0, 212, 170, 0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--accent-teal)",
                      animation: "pulse 2s ease infinite",
                    }}
                  ></span>
                  Live Data
                </div>
                <div className={`market-status ${marketStatus.className}`}>
                  <span className="status-dot"></span>
                  {marketStatus.label}
                </div>
              </div>
            </div>

            <div className="market-meta">
              <div className="market-author">
                <div className="author-avatar">⬢</div>
                <div className="author-details">
                  <div className="author-name">
                    {truncateAddress(market.creator)}
                  </div>
                  <div className="author-stats">Market Creator</div>
                </div>
              </div>
              <div className="market-tags">
                <span className="market-tag sports">📊 Prediction Market</span>
                {market.expiry > 0 && (
                  <span className="market-tag time">
                    ⏰ {isExpired ? "Expired" : `Closes in ${timeRemaining}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="market-grid">
          <div className="market-main">
            {/* 1. STATE: FINAL RESOLVED */}
            {market.resolved && (
              <div className="resolution-result-card">
                <div className="res-icon-wrapper">🏆</div>
                <div className="res-content">
                  <h3>MARKET SETTLED</h3>
                  <p>
                    Winning Outcome:{" "}
                    <span className="winner-highlight">
                      {winningLabel || "Unknown"}
                    </span>
                  </p>
                  <div className="resolution-hash">
                    Root: {market.stateRoot?.slice(0, 10)}...
                    {market.stateRoot?.slice(-8)}
                  </div>
                </div>
              </div>
            )}

            {/* 2. STATE: SETTLING (Result Submitted, Challenge Period) */}
            {hasResultPending && (
              <div className="resolution-result-card pending">
                <div className="res-icon-wrapper">⏳</div>
                <div className="res-content">
                  <h3>RESOLUTION PROPOSED</h3>
                  <p>
                    Pending Outcome:{" "}
                    <span className="winner-highlight pending">
                      {winningLabel || "Hidden"}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* 3. STATE: RESOLVING (Creator Needs to Input) */}
            {/* Logic: Expired AND No Pending Result AND Creator is User */}
            {isExpired &&
              !market.resolved &&
              !hasResultPending &&
              market.creator === address && (
                <div className="sidebar-card resolution-card">
                  <h3 className="sidebar-card-title">Resolve Market</h3>
                  <p className="form-hint" style={{ marginBottom: "16px" }}>
                    Select the final outcome and provide a justification.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Winning Option</label>
                    <select
                      className="form-input"
                      style={{ width: "100%", cursor: "pointer" }}
                      value={winningOptionId}
                      onChange={(e) => setWinningOptionId(e.target.value)}
                    >
                      <option value="">Select Outcome...</option>
                      {marketOptions.map((opt) => (
                        <option key={opt.label} value={opt.label}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginTop: "16px" }}>
                    <label className="form-label">Justification</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Reasoning..."
                      rows={3}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                    />
                  </div>
                  <button
                    className="submit-btn"
                    style={{ marginTop: "16px", width: "100%" }}
                    onClick={handleResolve}
                    disabled={isLoading}
                  >
                    {isLoading ? "Resolving..." : "Confirm Resolution →"}
                  </button>
                </div>
              )}

            {/* 4. STATE: RESOLVING (Oracle Trigger) */}
            {/* Logic: Expired AND No Pending Result AND Not Creator Type */}
            {isExpired &&
              !market.resolved &&
              !hasResultPending &&
              market.resolutionType?.toLowerCase() !== "creator" && (
                <div className="resolution-action-card">
                  <div className="res-icon-wrapper">⚖️</div>
                  <div className="res-content">
                    <h3>READY FOR RESOLUTION</h3>
                    <p>
                      This market requires settlement via{" "}
                      {market.resolutionType || "Oracle"}.
                    </p>
                  </div>
                  <button
                    className={"resolve-oracle-btn"}
                    onClick={handlePublicResolve}
                  >
                    TRIGGER RESOLUTION <span className="btn-arrow">→</span>
                  </button>
                </div>
              )}

            <div className="info-card">
              <h3 className="info-card-title">Market Details</h3>
              <p className="market-description text-xl">
                {market.description || "No description provided."}
              </p>
              <div className="market-stats-row">
                <div className="market-stat">
                  <div className="market-stat-label">Total Liquidity</div>
                  <div className="market-stat-value">
                    ${state.volume.toFixed(2)}
                  </div>
                </div>
                <div className="market-stat">
                  <div className="market-stat-label">Total Options</div>
                  <div className="market-stat-value">
                    {marketOptions.length}
                  </div>
                </div>
                <div className="market-stat">
                  <div className="market-stat-label">Liquidity Factor</div>
                  <div className="market-stat-value position">{state.b}</div>
                </div>
              </div>
            </div>

            <div className="outcomes-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h3 className="outcomes-card-title" style={{ marginBottom: 0 }}>
                  {isExpired || market.resolved
                    ? "Market Outcomes"
                    : "Place Your Trade"}
                </h3>
                {state.isOptionsLoading && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--accent-teal)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ animation: "spin 1s linear infinite" }}>
                      ⟳
                    </span>{" "}
                    Loading data...
                  </div>
                )}
              </div>

              <div className="outcomes-list">
                {marketOptions.length === 0 && !state.isOptionsLoading ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      background: "var(--bg-elevated)",
                      borderRadius: "16px",
                      border: "2px dashed var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      📊
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 600 }}>
                      No options available
                    </div>
                  </div>
                ) : null}

                {marketOptions.map((option) => {
                  const betAmount = betAmounts[option.label]
                    ? parseFloat(betAmounts[option.label])
                    : 0;

                  // Visual State Logic
                  const isWinner = winningLabel === option.label;
                  // If Resolved OR Settling: Losers are dimmed
                  const isLoser =
                    (market.resolved || hasResultPending) && !isWinner;

                  return (
                    <div
                      key={option.id}
                      className={`outcome-bet-card 
                        ${selectedOutcome === option.label ? "selected" : ""}
                        ${(market.resolved || hasResultPending) && isWinner ? "winner-card" : ""}
                        ${isLoser ? "loser-card" : ""}
                      `}
                      onClick={() =>
                        !isExpired &&
                        !market.resolved &&
                        setSelectedOutcome(option.label)
                      }
                    >
                      <div className="outcome-header">
                        <div className="outcome-info">
                          <span className="outcome-name">
                            {option.name}
                            {(market.resolved || hasResultPending) &&
                              isWinner && (
                                <span className="winner-badge">WINNER</span>
                              )}
                          </span>
                        </div>
                        <div className="outcome-odds-badge">
                          {(Number(option.probability) * 100).toFixed(2)}%
                        </div>
                      </div>

                      <div className="outcome-stats">
                        <div className="outcome-stat-item">
                          <span className="outcome-stat-label">Price</span>
                          <span className="outcome-stat-value">
                            ${option.current_price.toFixed(4)}
                          </span>
                        </div>
                        <div className="outcome-stat-item">
                          <span className="outcome-stat-label">
                            Total Shares
                          </span>
                          <span className="outcome-stat-value">
                            {option.shares}
                          </span>
                        </div>
                        <div className="outcome-stat-item">
                          <span className="outcome-stat-label">
                            Your Shares
                          </span>
                          <span className="outcome-stat-value">
                            {option.userShares}
                          </span>
                        </div>
                      </div>

                      {/* Betting Inputs - Only when Open */}
                      {!isExpired && !market.resolved && (
                        <>
                          <div className="bet-input-section">
                            <div className="bet-input-wrapper">
                              <span className="bet-input-label">
                                No. of Shares
                              </span>
                              <div className="bet-input-container">
                                <input
                                  type="number"
                                  className="bet-input"
                                  placeholder="0.00"
                                  value={betAmounts[option.label] || ""}
                                  onChange={(e) =>
                                    handleBetAmountChange(
                                      option.label,
                                      e.target.value,
                                    )
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            </div>
                            <div className="bet-quick-amounts">
                              {[10, 25, 50, 100].map((amount) => (
                                <button
                                  key={amount}
                                  className="quick-amount-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBetAmountChange(
                                      option.label,
                                      amount.toString(),
                                    );
                                  }}
                                >
                                  {amount}
                                </button>
                              ))}
                            </div>
                          </div>

                          {betAmount > 0 && (
                            <div className="payout-preview">
                              {state.isLoading ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                  }}
                                >
                                  <span
                                    style={{
                                      animation: "spin 1s linear infinite",
                                    }}
                                  >
                                    ⟳
                                  </span>{" "}
                                  Calculating...
                                </div>
                              ) : (
                                <>
                                  {state.preview.cost !== null &&
                                    state.preview.avgPrice !== null && (
                                      <>
                                        <div className="payout-row">
                                          <span className="payout-label">
                                            Estimated Cost
                                          </span>
                                          <span className="payout-value">
                                            ${state.preview.cost.toFixed(4)}
                                          </span>
                                        </div>
                                        <div className="payout-row">
                                          <span className="payout-label">
                                            Average Price
                                          </span>
                                          <span className="payout-value">
                                            ${state.preview.avgPrice.toFixed(4)}
                                          </span>
                                        </div>
                                        <div className="payout-row">
                                          <span className="payout-label">
                                            Your account balance
                                          </span>
                                          <span className="payout-value">
                                            {balance !== null
                                              ? `${parseFloat(balance).toFixed(3)}`
                                              : "Loading..."}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                </>
                              )}
                            </div>
                          )}

                          <div className="trade-buttons">
                            <button
                              className="place-bet-btn buy"
                              disabled={betAmount <= 0 || isTrading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBuy(
                                  option.option_id,
                                  betAmounts[option.label],
                                );
                              }}
                            >
                              <span className="place-bet-icon">🎯</span>{" "}
                              {isTrading ? "Trading..." : "Buy Shares"}
                            </button>
                            {option.userShares > 0 && (
                              <button
                                className="place-bet-btn sell"
                                disabled={isTrading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSell(
                                    option.option_id,
                                    option.userShares,
                                  );
                                }}
                              >
                                <span className="place-bet-icon">💰</span>{" "}
                                {isTrading
                                  ? "Trading..."
                                  : `Sell ${option.userShares} Shares`}
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {/* Footer Status */}
                      {(isExpired || market.resolved) && (
                        <div
                          className={`market-closed-notice ${isWinner ? "winner" : ""}`}
                        >
                          <span className="closed-icon">
                            {market.resolved
                              ? isWinner
                                ? "🎉"
                                : "❌"
                              : hasResultPending
                                ? "⚖️"
                                : "🔒"}
                          </span>
                          {/* STATUS TEXT LOGIC */}
                          {market.resolved
                            ? isWinner
                              ? "Winning Outcome"
                              : "Outcome Lost"
                            : hasResultPending
                              ? isWinner
                                ? "Proposed Winner (Settling)"
                                : "Proposed Loser"
                              : "Market Expired - Awaiting Resolution"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="market-sidebar">
            <div className="sidebar-card">
              <h3 className="sidebar-card-title">Probability Distribution</h3>
              <div className="odds-chart">
                {marketOptions.map((option, index) => (
                  <div key={option.id} className="odds-bar-wrapper">
                    <div className="odds-bar-header">
                      <span className="odds-bar-label">{option.name}</span>
                      <span className="odds-bar-percentage">
                        {(Number(option.probability) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="odds-bar">
                      <div
                        className="odds-bar-fill"
                        style={{
                          width: `${Number(option.probability) * 100}%`,
                          animationDelay: `${index * 0.1}s`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sidebar-card">
              <h3 className="sidebar-card-title">Market Information</h3>
              <div className="market-info-list">
                <div className="market-info-item">
                  <span className="info-label">Creator</span>
                  <span className="info-value">
                    {truncateAddress(market.creator)}
                  </span>
                </div>
                <div className="market-info-item">
                  <span className="info-label">Options</span>
                  <span className="info-value">{marketOptions.length}</span>
                </div>
                {market.expiry > 0 && (
                  <div className="market-info-item">
                    <span className="info-label">Expiry</span>
                    <span className="info-value">
                      {new Date(market.expiry * 1000).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="market-info-item">
                  <span className="info-label">Status</span>
                  <span
                    className={`info-value status-${marketStatus.className}`}
                  >
                    {marketStatus.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
