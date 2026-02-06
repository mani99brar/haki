'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import './market.css';
import { useParams } from "next/navigation";
import { useHakiContract } from "@/hooks/useHakiContract";

interface MarketOption {
  id: string;
  name: string;
  odds: number;
  price: number;
  volume: number;
  holders: number;
  userShares: number;
}

interface RecentBet {
  id: string;
  user: string;
  outcome: string;
  amount: number;
  odds: number;
  timestamp: string;
}

// Mock recent bets - replace with real data when available
const MOCK_RECENT_BETS: RecentBet[] = [
  { id: '1', user: 'CryptoTrader', outcome: 'Option 1', amount: 250, odds: 58, timestamp: '2m ago' },
  { id: '2', user: 'MarketMaker', outcome: 'Option 2', amount: 500, odds: 28, timestamp: '5m ago' },
  { id: '3', user: 'BetKing', outcome: 'Option 1', amount: 150, odds: 59, timestamp: '8m ago' },
];

export default function MarketPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [betAmounts, setBetAmounts] = useState<{ [key: string]: string }>({});
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

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
    if (!market) return { label: 'Loading', className: 'loading' };
    if (market.resolved) return { label: 'Resolved', className: 'resolved' };
    if (isExpired) return { label: 'Resolving', className: 'resolving' };
    return { label: 'Open', className: 'open' };
  }, [market, isExpired]);

  // Generate market options with mock prices and user shares
  const marketOptions: MarketOption[] = useMemo(() => {
    if (!market?.options) return [];

    const baseOdds = [45, 30, 15, 10];
    return market.options.map((option, index) => ({
      id: index.toString(),
      name: option,
      odds: baseOdds[index] || Math.max(5, 60 - index * 10),
      price: (baseOdds[index] || Math.max(5, 60 - index * 10)) / 100,
      volume: Math.floor(Math.random() * 10000) + 5000,
      holders: Math.floor(Math.random() * 200) + 50,
      userShares: Math.floor(Math.random() * 100),
    }));
  }, [market?.options]);

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!market?.expiry) return 'No expiry set';
    const now = Date.now() / 1000;
    const diff = market.expiry - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }, [market?.expiry]);

  // Trade functions
  const handleBuy = (optionId: string, amount: string) => {
    console.log('🎯 BUY', {
      marketId: id,
      optionId,
      amount,
      option: marketOptions.find(o => o.id === optionId)?.name,
    });
  };

  const handleSell = (optionId: string, shares: number) => {
    console.log('💰 SELL', {
      marketId: id,
      optionId,
      shares,
      option: marketOptions.find(o => o.id === optionId)?.name,
    });
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (!address) return 'Unknown';
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
            <p>The market you&apos;re looking for doesn&apos;t exist or hasn&apos;t been created yet.</p>
            <button onClick={() => router.push('/')} className="back-btn">
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
              <h1 className="market-question">
                {market.label}.haki.eth
              </h1>
              <div className={`market-status ${marketStatus.className}`}>
                <span className="status-dot"></span>
                {marketStatus.label}
              </div>
            </div>

            <div className="market-meta">
              <div className="market-author">
                <div className="author-avatar">⬢</div>
                <div className="author-details">
                  <div className="author-name">{truncateAddress(market.creator)}</div>
                  <div className="author-stats">
                    Market Creator
                  </div>
                </div>
              </div>

              <div className="market-tags">
                <span className="market-tag sports">📊 Prediction Market</span>
                {market.expiry > 0 && (
                  <span className="market-tag time">
                    ⏰ {isExpired ? 'Expired' : `Closes in ${timeRemaining}`}
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
                {market.description || 'No description provided for this market.'}
              </p>

              <div className="market-stats-row">
                <div className="market-stat">
                  <div className="market-stat-label">Total Volume</div>
                  <div className="market-stat-value">
                    ${marketOptions.reduce((sum, opt) => sum + opt.volume, 0).toLocaleString()}
                  </div>
                </div>
                <div className="market-stat">
                  <div className="market-stat-label">Total Holders</div>
                  <div className="market-stat-value">
                    {marketOptions.reduce((sum, opt) => sum + opt.holders, 0)}
                  </div>
                </div>
                <div className="market-stat">
                  <div className="market-stat-label">Your Shares</div>
                  <div className="market-stat-value position">
                    {marketOptions.reduce((sum, opt) => sum + opt.userShares, 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Outcomes Betting Card */}
            <div className="outcomes-card">
              <h3 className="outcomes-card-title">
                {isExpired || market.resolved ? 'Market Outcomes' : 'Place Your Trade'}
              </h3>

              <div className="outcomes-list">
                {marketOptions.map((option) => {
                  const betAmount = betAmounts[option.id] ? parseFloat(betAmounts[option.id]) : 0;
                  const expectedPayout = betAmount > 0 ? betAmount / option.price : 0;
                  const potentialProfit = expectedPayout - betAmount;

                  return (
                    <div
                      key={option.id}
                      className={`outcome-bet-card ${selectedOutcome === option.id ? "selected" : ""}`}
                      onClick={() => !isExpired && !market.resolved && setSelectedOutcome(option.id)}
                    >
                      <div className="outcome-header">
                        <div className="outcome-info">
                          <span className="outcome-emoji">
                            {option.id === '0' ? '🥇' : option.id === '1' ? '🥈' : option.id === '2' ? '🥉' : '◆'}
                          </span>
                          <span className="outcome-name">{option.name}</span>
                        </div>
                        <div className="outcome-odds-badge">{option.odds}%</div>
                      </div>

                      <div className="outcome-stats">
                        <div className="outcome-stat-item">
                          <span className="outcome-stat-label">Price</span>
                          <span className="outcome-stat-value">
                            ${option.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="outcome-stat-item">
                          <span className="outcome-stat-label">Volume</span>
                          <span className="outcome-stat-value">
                            ${option.volume.toLocaleString()}
                          </span>
                        </div>
                        <div className="outcome-stat-item">
                          <span className="outcome-stat-label">Your Shares</span>
                          <span className="outcome-stat-value">
                            {option.userShares}
                          </span>
                        </div>
                      </div>

                      {!isExpired && !market.resolved && (
                        <>
                          <div className="bet-input-section">
                            <div className="bet-input-wrapper">
                              <span className="bet-input-label">Amount (USD)</span>
                              <div className="bet-input-container">
                                <span className="bet-input-symbol">$</span>
                                <input
                                  type="number"
                                  className="bet-input"
                                  placeholder="0.00"
                                  value={betAmounts[option.id] || ""}
                                  onChange={(e) =>
                                    handleBetAmountChange(option.id, e.target.value)
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
                                      option.id,
                                      amount.toString(),
                                    );
                                  }}
                                >
                                  ${amount}
                                </button>
                              ))}
                            </div>
                          </div>

                          {betAmount > 0 && (
                            <div className="payout-preview">
                              <div className="payout-row">
                                <span className="payout-label">
                                  Expected Shares
                                </span>
                                <span className="payout-value">
                                  {expectedPayout.toFixed(2)}
                                </span>
                              </div>
                              <div className="payout-row profit">
                                <span className="payout-label">
                                  Potential Profit (if wins)
                                </span>
                                <span className="payout-value profit">
                                  +${potentialProfit.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="trade-buttons">
                            <button
                              className="place-bet-btn buy"
                              disabled={betAmount <= 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBuy(option.id, betAmounts[option.id]);
                              }}
                            >
                              <span className="place-bet-icon">🎯</span>
                              Buy Shares
                            </button>

                            {option.userShares > 0 && (
                              <button
                                className="place-bet-btn sell"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSell(option.id, option.userShares);
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
                          {market.resolved ? 'Market Resolved' : 'Market Resolving'}
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
            {/* Odds Distribution */}
            <div className="sidebar-card">
              <h3 className="sidebar-card-title">Odds Distribution</h3>
              <div className="odds-chart">
                {marketOptions.map((option) => (
                  <div key={option.id} className="odds-bar-wrapper">
                    <div className="odds-bar-header">
                      <span className="odds-bar-label">
                        {option.name}
                      </span>
                      <span className="odds-bar-percentage">
                        {option.odds}%
                      </span>
                    </div>
                    <div className="odds-bar">
                      <div
                        className="odds-bar-fill"
                        style={{ width: `${option.odds}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="sidebar-card activity-card">
              <h3 className="sidebar-card-title">Recent Activity</h3>
              <div className="activity-list">
                {MOCK_RECENT_BETS.map((bet) => (
                  <div key={bet.id} className="activity-item">
                    <div className="activity-user-avatar">{bet.user[0]}</div>
                    <div className="activity-details">
                      <div className="activity-user">{bet.user}</div>
                      <div className="activity-action">
                        Traded ${bet.amount} on <strong>{bet.outcome}</strong>
                      </div>
                    </div>
                    <div className="activity-meta">
                      <div className="activity-odds">{bet.odds}%</div>
                      <div className="activity-time">{bet.timestamp}</div>
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
                  <span className="info-value">{truncateAddress(market.creator)}</span>
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
                  <span className={`info-value status-${marketStatus.className}`}>
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
