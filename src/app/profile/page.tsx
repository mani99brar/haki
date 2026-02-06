'use client';

import { useState, useEffect } from "react";
import Navigation from '@/components/Navigation';
import { useYellowActions } from "@/hooks/yellow/useYellowActions";
import './profile.css';
import { useYellow } from "@/context/YellowProvider";
import { useAppKitAccount } from "@reown/appkit/react";
import { Address } from "viem";
interface Transaction {
  id: string;
  type: 'win' | 'loss' | 'deposit' | 'withdraw';
  amount: number;
  description: string;
  timestamp: string;
}

interface Prediction {
  id: string;
  question: string;
  status: 'active' | 'won' | 'lost' | 'pending';
  participants: number;
  yourStance: string;
  timeLeft?: string;
  outcome?: string;
  profit?: number;
}


const TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'win', amount: 245.50, description: 'India vs Australia prediction', timestamp: '2h ago' },
  { id: '2', type: 'win', amount: 128.00, description: 'Oscar Best Picture 2027', timestamp: '1d ago' },
  { id: '3', type: 'deposit', amount: 500.00, description: 'Wallet deposit', timestamp: '3d ago' },
  { id: '4', type: 'loss', amount: -50.00, description: 'NBA Finals prediction', timestamp: '5d ago' },
  { id: '5', type: 'win', amount: 89.25, description: 'Tech startup advice', timestamp: '1w ago' },
];

const ACTIVE_PREDICTIONS: Prediction[] = [
  {
    id: '1',
    question: 'Will GPT-5 be released in 2026?',
    status: 'active',
    participants: 2847,
    yourStance: 'Yes, before December',
    timeLeft: '6d left',
  },
  {
    id: '2',
    question: 'Mars landing in 2027?',
    status: 'active',
    participants: 5234,
    yourStance: 'Yes, SpaceX will succeed',
    timeLeft: '2d left',
  },
  {
    id: '3',
    question: 'Best horror movie recommendation?',
    status: 'pending',
    participants: 892,
    yourStance: 'The Exorcist (1973)',
  },
];

const PREDICTION_HISTORY: Prediction[] = [
  {
    id: '1',
    question: 'India vs Australia Test match winner?',
    status: 'won',
    participants: 4523,
    yourStance: 'India wins',
    outcome: 'India won by 6 wickets',
    profit: 245.50,
  },
  {
    id: '2',
    question: 'Oscar Best Picture 2027 winner?',
    status: 'won',
    participants: 734,
    yourStance: 'The Brutalist',
    outcome: 'Correct prediction',
    profit: 128.00,
  },
  {
    id: '3',
    question: 'NBA Finals champion 2026?',
    status: 'lost',
    participants: 2891,
    yourStance: 'Lakers',
    outcome: 'Celtics won',
    profit: -50.00,
  },
];



export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'achievements'>('active');
  const { getBalance, balance, asset, isLoading } = useYellowActions();
  const { sessionSigner, status } = useYellow();
  const { address } = useAppKitAccount();
  useEffect(() => {
    console.log(status);
    if (status === "active" && address && sessionSigner) {
      getBalance(address as Address, sessionSigner);
    }
  }, [status, address, sessionSigner, getBalance]);
  useEffect(() => {
    console.log(balance, asset);
  }, [balance, asset]);

  return (
    <>
      <Navigation />

      <div className="profile-container">
        {/* Profile Hero */}
        <div className="profile-hero">
          <div className="hero-background">
            <div className="hero-gradient"></div>
            <div className="hero-pattern"></div>
          </div>

          <div className="hero-content">
            <div className="profile-main">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">M</div>
                <div className="avatar-ring"></div>
                <div className="level-badge">42</div>
              </div>

              <div className="profile-info">
                <h1 className="profile-name">Mani Brar</h1>
                <p className="profile-bio">
                  Tech enthusiast, sports fanatic, movie buff. Here to make
                  predictions that matter.
                </p>
                <button className="edit-profile-btn">
                  <span>✏️</span>
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat">
                <div className="stat-value">1,247</div>
                <div className="stat-label">Followers</div>
              </div>
              <div className="profile-stat">
                <div className="stat-value">892</div>
                <div className="stat-label">Following</div>
              </div>
              <div className="profile-stat">
                <div className="stat-value">73%</div>
                <div className="stat-label">Accuracy</div>
              </div>
              <div className="profile-stat credibility">
                <div className="stat-value">
                  <span className="credibility-icon">✓</span>
                  Elite
                </div>
                <div className="stat-label">Credibility</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          <div className="dashboard-top">
            {/* Balance Card */}
            <div className="balance-card">
              <div className="balance-header">
                <h3 className="balance-title">
                  <span className="balance-icon">💰</span>
                  Wallet Balance
                </h3>
                <div className="balance-actions">
                  <button className="balance-action-btn deposit">
                    <span>+</span> Deposit
                  </button>
                  <button className="balance-action-btn withdraw">
                    <span>↑</span> Withdraw
                  </button>
                </div>
              </div>

              <div className="balance-amount">
                <div className="currency-symbol">$</div>
                <div className="amount-value">
                  {isLoading ? "Loading..." : balance}
                </div>
                <p>{asset}</p>
              </div>

              <div className="balance-change positive">
                <span className="change-icon">↗</span>
                <span className="change-text">+$373.50 this week</span>
              </div>

              <div className="recent-transactions">
                <h4 className="transactions-title">Recent Activity</h4>
                <div className="transactions-list">
                  {TRANSACTIONS.slice(0, 4).map((tx) => (
                    <div key={tx.id} className={`transaction-item ${tx.type}`}>
                      <div className="transaction-icon">
                        {tx.type === "win" && "💰"}
                        {tx.type === "loss" && "📉"}
                        {tx.type === "deposit" && "⬇️"}
                        {tx.type === "withdraw" && "⬆️"}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-description">
                          {tx.description}
                        </div>
                        <div className="transaction-time">{tx.timestamp}</div>
                      </div>
                      <div
                        className={`transaction-amount ${tx.amount > 0 ? "positive" : "negative"}`}
                      >
                        {tx.amount > 0 ? "+" : ""}$
                        {Math.abs(tx.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-card-icon">📊</div>
                <div className="stat-card-value">127</div>
                <div className="stat-card-label">Total Predictions</div>
                <div className="stat-card-trend">+12 this month</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-icon">🎯</div>
                <div className="stat-card-value">73%</div>
                <div className="stat-card-label">Win Rate</div>
                <div className="stat-card-trend">+5% from last month</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-icon">👥</div>
                <div className="stat-card-value">42.3k</div>
                <div className="stat-card-label">Influenced</div>
                <div className="stat-card-trend">Total participants</div>
              </div>

              <div className="stat-card streak">
                <div className="stat-card-icon">🔥</div>
                <div className="stat-card-value">8</div>
                <div className="stat-card-label">Current Streak</div>
                <div className="stat-card-trend">Personal best: 12</div>
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="activity-section">
            <div className="activity-tabs">
              <button
                className={`activity-tab ${activeTab === "active" ? "active" : ""}`}
                onClick={() => setActiveTab("active")}
              >
                <span className="tab-icon">⚡</span>
                Active Predictions
                <span className="tab-count">{ACTIVE_PREDICTIONS.length}</span>
              </button>
              <button
                className={`activity-tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                <span className="tab-icon">📜</span>
                History
                <span className="tab-count">{PREDICTION_HISTORY.length}</span>
              </button>
            </div>

            <div className="activity-content">
              {activeTab === "active" && (
                <div className="predictions-list">
                  {ACTIVE_PREDICTIONS.map((pred) => (
                    <div key={pred.id} className="prediction-card">
                      <div className="prediction-header">
                        <h4 className="prediction-question">{pred.question}</h4>
                        <div className={`prediction-status ${pred.status}`}>
                          {pred.status === "active" && "🟢 Active"}
                          {pred.status === "pending" && "🟡 Pending"}
                        </div>
                      </div>

                      <div className="prediction-stance">
                        <span className="stance-label">Your stance:</span>
                        <span className="stance-value">{pred.yourStance}</span>
                      </div>

                      <div className="prediction-footer">
                        <div className="prediction-participants">
                          👥 {pred.participants.toLocaleString()} participants
                        </div>
                        {pred.timeLeft && (
                          <div className="prediction-time">
                            ⏰ {pred.timeLeft}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "history" && (
                <div className="predictions-list">
                  {PREDICTION_HISTORY.map((pred) => (
                    <div
                      key={pred.id}
                      className={`prediction-card history ${pred.status}`}
                    >
                      <div className="prediction-header">
                        <h4 className="prediction-question">{pred.question}</h4>
                        <div className={`prediction-status ${pred.status}`}>
                          {pred.status === "won" && "✅ Won"}
                          {pred.status === "lost" && "❌ Lost"}
                        </div>
                      </div>

                      <div className="prediction-stance">
                        <span className="stance-label">Your stance:</span>
                        <span className="stance-value">{pred.yourStance}</span>
                      </div>

                      <div className="prediction-outcome">
                        <span className="outcome-label">Outcome:</span>
                        <span className="outcome-value">{pred.outcome}</span>
                      </div>

                      <div className="prediction-footer">
                        <div className="prediction-participants">
                          👥 {pred.participants.toLocaleString()} participants
                        </div>
                        {pred.profit && (
                          <div
                            className={`prediction-profit ${pred.profit > 0 ? "positive" : "negative"}`}
                          >
                            {pred.profit > 0 ? "+" : ""}$
                            {Math.abs(pred.profit).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
