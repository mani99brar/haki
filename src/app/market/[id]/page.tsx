'use client';

import { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import './market.css';
import { useParams } from "next/navigation";
import { useHakiContract } from "@/hooks/useHakiContract";
import { useYellowTrade } from "@/hooks/yellow/useYellowTrade";
import { useMarketData } from "@/hooks/useMarketTradePreview";

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
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [betAmounts, setBetAmounts] = useState<{ [key: string]: string }>({});
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const { placeBet, isTrading, sellShares } = useYellowTrade();
  const currentAmount = parseFloat(betAmounts[selectedOutcome || ""] || "0");
  const state = useMarketData(id, selectedOutcome, currentAmount);

  useEffect(() => {
    console.log("PREVIEW STATE");
    console.log(selectedOutcome);
    console.log(selectedOutcome ? Number(betAmounts[selectedOutcome]) : "NOPE");
  }, [selectedOutcome, betAmounts]);
  console.log("MARKET STATE", state);

  const handleBetAmountChange = (outcomeId: string, value: string) => {
    setBetAmounts({ ...betAmounts, [outcomeId]: value });
  };

  const { market, isLoading } = useHakiContract(id);

  // Check if market has expired
  const isExpired = useMemo(() => {
    if (!market?.expiry) return false;
    return Date.now() / 1000 > market.expiry;
  }, [market?.expiry]);

  // Determine market status
  const marketStatus = useMemo(() => {
    if (!market) return { label: "Loading", className: "loading" };
    if (market.resolved) return { label: "Resolved", className: "resolved" };
    if (isExpired) return { label: "Resolving", className: "resolving" };
    return { label: "Open", className: "open" };
  }, [market, isExpired]);

  // Generate market options from real data
  const marketOptions: MarketOption[] = useMemo(() => {
    if (!state.options || state.options.length === 0) return [];

    // Calculate total liquidity to derive probabilities
    const totalLiquidity = state.options.reduce(
      (sum, opt) => sum + (opt.shares || 0),
      0,
    );

    return state.options.map((option, index) => {
      // 1. Find the user's position for this specific option UUID
      const userPos = state.userPositions?.find(
        (p) => p.option_id === option.option_id,
      );
      console.log("userPos", userPos);
      console.log("statePos", state.userPositions);

      return {
        id: index.toString(),
        option_id: option.option_id,
        name: option.label,
        label: option.label,
        probability: option.probability,
        current_price: option.marginal_price || 0,
        // 2. Map the real shares held by the user (default to 0)
        shares: option.shares,
        userShares: userPos ? userPos.shares : 0,
      };
    });
  }, [state.userPositions]);

  // Calculate time remaining
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

  // Trade functions
  const handleBuy = (optionId: string, amount: string) => {
    console.log("🎯 BUY", {
      marketId: id,
      optionId,
      amount,
      option: marketOptions.find((o) => o.id === optionId)?.name,
    });
    placeBet(amount, state.marketId!, optionId, currentAmount);
  };

  const handleSell = (optionId: string, shares: number) => {
    console.log("💰 SELL", {
      marketId: id,
      optionId,
      shares,
      option: marketOptions.find((o) => o.id === optionId)?.name,
    });
    if (state.marketId == null) return;
    sellShares("0", state?.marketId, optionId, shares);
  };

  // Truncate address for display
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
            <p>
              The market you&apos;re looking for doesn&apos;t exist or
              hasn&apos;t been created yet.
            </p>
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
        {/* Market Header */}
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
              <h1 className="market-question">{market.label}.haki-pm.eth</h1>
              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
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

        {/* Main Grid */}
        <div className="market-grid">
          {/* Left Column - Betting Interface */}
          <div className="market-main">
            {/* Market Info Card */}
            <div className="info-card">
              <h3 className="info-card-title">Market Details</h3>
              <p className="market-description text-xl">
                {market.description ||
                  "No description provided for this market."}
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
                {/* <div className="market-stat">
                  <div className="market-stat-label">Your Shares</div>
                  <div className="market-stat-value position">
                    {marketOptions.reduce(
                      (sum, opt) => sum + opt.userShares,
                      0,
                    )}
                  </div>
                </div> */}
              </div>
            </div>

            {/* Outcomes Betting Card */}
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
                    </span>
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
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        marginBottom: "8px",
                      }}
                    >
                      No options available
                    </div>
                    <div style={{ fontSize: "14px" }}>
                      Market data will appear here once loaded
                    </div>
                  </div>
                ) : null}
                {marketOptions.map((option) => {
                  const betAmount = betAmounts[option.label]
                    ? parseFloat(betAmounts[option.label])
                    : 0;

                  return (
                    <div
                      key={option.id}
                      className={`outcome-bet-card ${selectedOutcome === option.label ? "selected" : ""}`}
                      onClick={() =>
                        !isExpired &&
                        !market.resolved &&
                        setSelectedOutcome(option.label)
                      }
                    >
                      <div className="outcome-header">
                        <div className="outcome-info">
                          <span className="outcome-name">{option.name}</span>
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
                        {/* <div className="outcome-stat-item">
                          <span className="outcome-stat-label">Liquidity</span>
                          <span className="outcome-stat-value">
                            ${option.liquidity.toFixed(2)}
                          </span>
                        </div> */}
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
                                    padding: "8px",
                                    color: "var(--text-secondary)",
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
                                  </span>
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
                                      </>
                                    )}
                                </>
                              )}
                            </div>
                          )}

                          <div className="trade-buttons">
                            <button
                              className="place-bet-btn buy"
                              disabled={betAmount <= 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBuy(
                                  option.option_id,
                                  betAmounts[option.label],
                                );
                              }}
                            >
                              <span className="place-bet-icon">🎯</span>
                              Buy Shares
                            </button>

                            {option.shares > 0 && (
                              <button
                                className="place-bet-btn sell"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSell(
                                    option.option_id,
                                    option.userShares,
                                  );
                                }}
                              >
                                <span className="place-bet-icon">💰</span>
                                Sell {option.userShares} Shares
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {(isExpired || market.resolved) && (
                        <div className="market-closed-notice">
                          <span className="closed-icon">🔒</span>
                          {market.resolved
                            ? "Market Resolved"
                            : "Market Resolving"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Activity */}
          <div className="market-sidebar">
            {/* Probability Distribution */}
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

            {/* Market Info */}
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
