'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import './market.css';

interface Outcome {
  id: string;
  emoji: string;
  name: string;
  odds: number;
  price: number;
  volume: number;
  holders: number;
}

interface RecentBet {
  id: string;
  user: string;
  outcome: string;
  amount: number;
  odds: number;
  timestamp: string;
}

const OUTCOMES: Outcome[] = [
  { id: '1', emoji: '🇮🇳', name: 'India wins', odds: 58, price: 0.58, volume: 12450, holders: 234 },
  { id: '2', emoji: '🇦🇺', name: 'Australia wins', odds: 28, price: 0.28, volume: 6890, holders: 156 },
  { id: '3', emoji: '🤝', name: 'Draw', odds: 14, price: 0.14, volume: 3120, holders: 89 },
];

const RECENT_BETS: RecentBet[] = [
  { id: '1', user: 'CricketFan', outcome: 'India wins', amount: 250, odds: 58, timestamp: '2m ago' },
  { id: '2', user: 'StatsMaster', outcome: 'Australia wins', amount: 500, odds: 28, timestamp: '5m ago' },
  { id: '3', user: 'BetKing', outcome: 'India wins', amount: 150, odds: 59, timestamp: '8m ago' },
  { id: '4', user: 'OzzyBets', outcome: 'Australia wins', amount: 300, odds: 27, timestamp: '12m ago' },
  { id: '5', user: 'PredictPro', outcome: 'Draw', amount: 100, odds: 14, timestamp: '15m ago' },
];

export default function MarketPage() {
  const router = useRouter();
  const [betAmounts, setBetAmounts] = useState<{ [key: string]: string }>({});
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  const handleBetAmountChange = (outcomeId: string, value: string) => {
    setBetAmounts({ ...betAmounts, [outcomeId]: value });
  };

  const calculatePayout = (outcomeId: string) => {
    const amount = parseFloat(betAmounts[outcomeId] || '0');
    const outcome = OUTCOMES.find(o => o.id === outcomeId);
    if (!outcome || amount === 0) return 0;
    return (amount / outcome.price).toFixed(2);
  };

  const calculateProfit = (outcomeId: string) => {
    const amount = parseFloat(betAmounts[outcomeId] || '0');
    const payout = parseFloat(calculatePayout(outcomeId));
    return (payout - amount).toFixed(2);
  };

  return (
    <>
      <Navigation />

      <div className="market-container">
        {/* Market Header */}
        <div className="market-header">
          <div className="market-header-content">
            <div className="market-breadcrumb">
              <button onClick={() => router.push('/')} className="breadcrumb-link">Home</button>
              <span className="breadcrumb-separator">›</span>
              <button onClick={() => router.push('/topics')} className="breadcrumb-link">Sports</button>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">India vs Australia</span>
            </div>

            <div className="market-title-row">
              <h1 className="market-question">Will India win the Test match vs Australia?</h1>
              <div className="market-status open">
                <span className="status-dot"></span>
                Open
              </div>
            </div>

            <div className="market-meta">
              <div className="market-author">
                <div className="author-avatar">🏏</div>
                <div className="author-details">
                  <div className="author-name">Raj Patel</div>
                  <div className="author-stats">92% accurate · 234 predictions</div>
                </div>
              </div>

              <div className="market-tags">
                <span className="market-tag sports">🏏 Cricket</span>
                <span className="market-tag time">⏰ Closes in 2d 14h</span>
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
              <p className="market-description">
                BGT 2026, third test at Sydney. India needs this to stay in the series.
                Pitch historically favors spin, and India has a strong spin attack led by Ashwin and Jadeja.
              </p>

              <div className="market-stats-row">
                <div className="market-stat">
                  <div className="market-stat-label">Total Volume</div>
                  <div className="market-stat-value">$22,460</div>
                </div>
                <div className="market-stat">
                  <div className="market-stat-label">Participants</div>
                  <div className="market-stat-value">479</div>
                </div>
                <div className="market-stat">
                  <div className="market-stat-label">Your Position</div>
                  <div className="market-stat-value position">+$125.50</div>
                </div>
              </div>
            </div>

            {/* Outcomes Betting Card */}
            <div className="outcomes-card">
              <h3 className="outcomes-card-title">Place Your Bet</h3>

              <div className="outcomes-list">
                {OUTCOMES.map((outcome) => (
                  <div
                    key={outcome.id}
                    className={`outcome-bet-card ${selectedOutcome === outcome.id ? 'selected' : ''}`}
                    onClick={() => setSelectedOutcome(outcome.id)}
                  >
                    <div className="outcome-header">
                      <div className="outcome-info">
                        <span className="outcome-emoji">{outcome.emoji}</span>
                        <span className="outcome-name">{outcome.name}</span>
                      </div>
                      <div className="outcome-odds-badge">{outcome.odds}%</div>
                    </div>

                    <div className="outcome-stats">
                      <div className="outcome-stat-item">
                        <span className="outcome-stat-label">Price</span>
                        <span className="outcome-stat-value">${outcome.price.toFixed(2)}</span>
                      </div>
                      <div className="outcome-stat-item">
                        <span className="outcome-stat-label">Volume</span>
                        <span className="outcome-stat-value">${outcome.volume.toLocaleString()}</span>
                      </div>
                      <div className="outcome-stat-item">
                        <span className="outcome-stat-label">Holders</span>
                        <span className="outcome-stat-value">{outcome.holders}</span>
                      </div>
                    </div>

                    <div className="bet-input-section">
                      <div className="bet-input-wrapper">
                        <span className="bet-input-label">Amount</span>
                        <div className="bet-input-container">
                          <span className="bet-input-symbol">$</span>
                          <input
                            type="number"
                            className="bet-input"
                            placeholder="0.00"
                            value={betAmounts[outcome.id] || ''}
                            onChange={(e) => handleBetAmountChange(outcome.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
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
                              handleBetAmountChange(outcome.id, amount.toString());
                            }}
                          >
                            ${amount}
                          </button>
                        ))}
                      </div>
                    </div>

                    {betAmounts[outcome.id] && parseFloat(betAmounts[outcome.id]) > 0 && (
                      <div className="payout-preview">
                        <div className="payout-row">
                          <span className="payout-label">Expected Payout</span>
                          <span className="payout-value">${calculatePayout(outcome.id)}</span>
                        </div>
                        <div className="payout-row profit">
                          <span className="payout-label">Potential Profit</span>
                          <span className="payout-value profit">+${calculateProfit(outcome.id)}</span>
                        </div>
                      </div>
                    )}

                    <button
                      className="place-bet-btn"
                      disabled={!betAmounts[outcome.id] || parseFloat(betAmounts[outcome.id]) <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Place bet:', outcome.name, betAmounts[outcome.id]);
                      }}
                    >
                      <span className="place-bet-icon">🎯</span>
                      Place Bet on {outcome.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Activity */}
          <div className="market-sidebar">
            {/* Odds Distribution */}
            <div className="sidebar-card">
              <h3 className="sidebar-card-title">Odds Distribution</h3>
              <div className="odds-chart">
                {OUTCOMES.map((outcome) => (
                  <div key={outcome.id} className="odds-bar-wrapper">
                    <div className="odds-bar-header">
                      <span className="odds-bar-label">
                        {outcome.emoji} {outcome.name}
                      </span>
                      <span className="odds-bar-percentage">{outcome.odds}%</span>
                    </div>
                    <div className="odds-bar">
                      <div
                        className="odds-bar-fill"
                        style={{ width: `${outcome.odds}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="sidebar-card activity-card">
              <h3 className="sidebar-card-title">Recent Bets</h3>
              <div className="activity-list">
                {RECENT_BETS.map((bet) => (
                  <div key={bet.id} className="activity-item">
                    <div className="activity-user-avatar">{bet.user[0]}</div>
                    <div className="activity-details">
                      <div className="activity-user">{bet.user}</div>
                      <div className="activity-action">
                        Bet ${bet.amount} on <strong>{bet.outcome}</strong>
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

            {/* Top Predictors */}
            <div className="sidebar-card">
              <h3 className="sidebar-card-title">Top Predictors</h3>
              <div className="top-predictors-list">
                {[
                  { name: 'StatsMaster', position: 'India wins', amount: 1250, profit: '+$420' },
                  { name: 'CricketGuru', position: 'India wins', amount: 980, profit: '+$310' },
                  { name: 'BetPro', position: 'Australia wins', amount: 750, profit: '+$180' },
                ].map((predictor, index) => (
                  <div key={index} className="predictor-item">
                    <div className="predictor-rank">#{index + 1}</div>
                    <div className="predictor-info">
                      <div className="predictor-name">{predictor.name}</div>
                      <div className="predictor-position">{predictor.position}</div>
                    </div>
                    <div className="predictor-stats">
                      <div className="predictor-amount">${predictor.amount}</div>
                      <div className="predictor-profit">{predictor.profit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
