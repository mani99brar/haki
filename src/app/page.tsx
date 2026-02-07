'use client';

import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import MarketCard from "@/components/MarketCard";
import { useAllMarkets } from "@/hooks/useAllMarkets";
import OnboardingManager from "@/components/OnBoarding";
import { useAppKitAccount } from "@reown/appkit/react";
import "./home.css";

export default function Home() {
  const router = useRouter();
  const { marketLabels, isLoading, nextPage, prevPage, isAtEnd, currentRange } =
    useAllMarkets();
  const { isConnected } = useAppKitAccount();
  

  const canGoPrev = currentRange.from > BigInt(10204130); // DEPLOY_BLOCK

  return (
    <>
      {isConnected && <OnboardingManager />}
      <Navigation />

      <div className="home-container">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-icon">⚡</span>
              <span>Use your observation Haki!</span>
            </div>
            <h1 className="hero-title">
              See the
              <span className="gradient-text"> Future</span>
            </h1>
            <p className="hero-subtitle">
              "Haki is a power that lies within all the world's creatures. To
              'not doubt'. That is great strength!" — Silvers Rayleigh
            </p>
            <div className="hero-actions">
              <button
                className="hero-btn primary"
                onClick={() => router.push("/create")}
              >
                <span className="btn-icon">✨</span>
                Create Market
              </button>
              <button className="hero-btn secondary">
                <span className="btn-icon">📚</span>
                Learn How It Works
              </button>
            </div>

            {/* Stats */}
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-value">{marketLabels.length}</div>
                <div className="stat-label">Active Markets</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">24/7</div>
                <div className="stat-label">Trading</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">100%</div>
                <div className="stat-label">On-Chain</div>
              </div>
            </div>
          </div>

          {/* Floating Cards Background Effect */}
          <div className="hero-background">
            <div className="floating-card card-1"></div>
            <div className="floating-card card-2"></div>
            <div className="floating-card card-3"></div>
          </div>
        </div>

        {/* Markets Section */}
        <div className="markets-section">
          <div className="markets-header">
            <div className="markets-header-content">
              <h2 className="section-title">
                <span className="title-icon">📊</span>
                Active Markets
              </h2>
              <p className="section-subtitle">
                Explore live prediction markets and start trading
              </p>
            </div>

            {/* Pagination Info */}
            <div className="pagination-info">
              <div className="block-range">
                Blocks: {currentRange.from.toString()} →{" "}
                {currentRange.to?.toString() || "Latest"}
              </div>
            </div>
          </div>

          {/* Markets Grid */}
          {isLoading ? (
            <div className="markets-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-card-wrapper">
                  <MarketCard marketLabel={`loading-${i}`} />
                </div>
              ))}
            </div>
          ) : marketLabels.length > 0 ? (
            <>
              <div className="markets-grid">
                {marketLabels.map((label) => (
                  <MarketCard key={label} marketLabel={label} />
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="pagination-controls">
                <button
                  className="pagination-btn prev"
                  onClick={prevPage}
                  disabled={!canGoPrev}
                >
                  <span className="pagination-arrow">←</span>
                  <span className="pagination-text">Previous</span>
                </button>

                <div className="pagination-dots">
                  <div className="pagination-dot active"></div>
                  <div className="pagination-dot"></div>
                  <div className="pagination-dot"></div>
                </div>

                <button
                  className="pagination-btn next"
                  onClick={nextPage}
                  disabled={isAtEnd}
                >
                  <span className="pagination-text">Next</span>
                  <span className="pagination-arrow">→</span>
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3 className="empty-title">No Markets Found</h3>
              <p className="empty-text">
                Be the first to create a prediction market in this block range!
              </p>
              <button
                className="empty-btn"
                onClick={() => router.push("/create")}
              >
                <span className="btn-icon">✨</span>
                Create First Market
              </button>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h2 className="section-title centered">Why Haki?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Trustless</h3>
              <p className="feature-description">
                All markets are governed by smart contracts. No central
                authority can manipulate outcomes.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Instant Settlement</h3>
              <p className="feature-description">
                Trade executes immediately on-chain. Get your winnings as soon
                as the market resolves.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3 className="feature-title">Permissionless</h3>
              <p className="feature-description">
                Anyone can create a market on anything. No approval needed, no
                restrictions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
