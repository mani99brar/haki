'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useHakiContract } from '@/hooks/useHakiContract';
import './MarketCard.css';

interface MarketCardProps {
  marketLabel: string;
}

export default function MarketCard({ marketLabel }: MarketCardProps) {
  const router = useRouter();
  const { market, isLoading } = useHakiContract(marketLabel);

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

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!market?.expiry || market.expiry === 0) return null;
    const now = Date.now() / 1000;
    const diff = market.expiry - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [market?.expiry]);

  // Generate mock odds for options
  const options = useMemo(() => {
    if (!market?.options) return [];
    const baseOdds = [45, 30, 15, 10];
    return market.options.map((option, index) => ({
      name: option,
      odds: baseOdds[index] || Math.max(5, 60 - index * 10),
    }));
  }, [market?.options]);

  // Truncate text
  const truncate = (text: string, length: number) => {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
  };

  if (isLoading) {
    return (
      <div className="market-card skeleton">
        <div className="skeleton-header">
          <div className="skeleton-line wide"></div>
          <div className="skeleton-badge"></div>
        </div>
        <div className="skeleton-body">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
        <div className="skeleton-options">
          <div className="skeleton-option"></div>
          <div className="skeleton-option"></div>
        </div>
      </div>
    );
  }

  if (!market) {
    return null;
  }

  return (
    <article
      className={`market-card ${marketStatus.className}`}
      onClick={() => router.push(`/market/${marketLabel}`)}
    >
      {/* Card Header */}
      <div className="card-header">
        <div className="market-label-chip">
          <span className="label-dot">●</span>
          <span className="label-text">{marketLabel}.haki-pm.eth</span>
        </div>
        <div className={`status-badge ${marketStatus.className}`}>
          <span className="status-pulse"></span>
          {marketStatus.label}
        </div>
      </div>

      {/* Card Title */}
      <h3 className="market-card-title">
        {truncate(market.description || marketLabel, 120)}
      </h3>

      {/* Card Footer */}
      <div className="card-footer">
        <div className="footer-meta">
          <div className="meta-item">
            <span className="meta-icon">📊</span>
            <span className="meta-text">{options.length} options</span>
          </div>
          {timeRemaining && (
            <div className="meta-item">
              <span className="meta-icon">⏰</span>
              <span className="meta-text">{timeRemaining}</span>
            </div>
          )}
        </div>
        <div className="view-market-btn">
          <span>Trade</span>
          <span className="arrow">→</span>
        </div>
      </div>
    </article>
  );
}
