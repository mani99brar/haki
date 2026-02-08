'use client';

import { useMemo } from "react";
import { useHakiContract } from '@/hooks/useHakiContract';
import { Address } from "viem";
import './UserMarketCard.css';

interface UserMarketCardProps {
  marketLabel: string;
  userAddress: Address;
  isCreator: boolean;
}

export default function UserMarketCard({
  marketLabel,
  userAddress,
  isCreator,
}: UserMarketCardProps) {
  console.log("Rendering UserMarketCard", {
    marketLabel,
    userAddress,
    isCreator,
  });
  const { market, isLoading } = useHakiContract(marketLabel);

  // Check if market has expired
  const isExpired = useMemo(() => {
    if (!market?.expiry) return false;
    return Date.now() / 1000 > market.expiry;
  }, [market?.expiry]);

  // Determine market status
  const marketStatus = useMemo(() => {
    if (!market) return { label: "LOADING", className: "loading" };
    if (market.resolved) return { label: "RESOLVED", className: "resolved" };
    if (isExpired) return { label: "RESOLVING", className: "resolving" };
    return { label: "ACTIVE", className: "active" };
  }, [market, isExpired]);

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    if (!market?.expiry || market.expiry === 0) return null;
    const now = Date.now() / 1000;
    const diff = market.expiry - now;

    if (diff <= 0) return "EXPIRED";

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);

    if (days > 0) return `${days}D ${hours}H`;
    return `${hours}H`;
  }, [market?.expiry]);

  // const handleWithdraw = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   setIsWithdrawing(true);

  //   // Mock withdrawal - replace with actual Yellow Network withdrawal
  //   setTimeout(() => {
  //     console.log("💰 WITHDRAW", {
  //       market: marketLabel,
  //       amount: userBalance,
  //       user: userAddress,
  //     });
  //     setIsWithdrawing(false);
  //   }, 1500);
  // };

  if (isLoading) {
    return (
      <div className="user-market-card-brutal skeleton">
        <div className="skeleton-header"></div>
        <div className="skeleton-body">
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
      </div>
    );
  }

  if (!market) {
    return null;
  }

  return (
    <article
      className={`user-market-card-brutal ${isCreator ? "creator" : "participant"}`}
    >
      {/* Card Type Badge */}
      <div className="card-type-badge">
        {isCreator ? "🏗️ CREATOR" : "🎯 TRADER"}
      </div>

      {/* Market Label */}
      <a
        href={`https://sepolia.app.ens.domains/${marketLabel}.haki-pm.eth`}
        target="_blank"
        rel="noopener noreferrer"
        className="market-label-link"
      >
        <div className="market-label-brutal">
          <span className="label-hash">#</span>
          {marketLabel}
          <span className="label-domain">.haki-pm.eth</span>
        </div>
      </a>

      {/* Market Description */}
      <div className="market-description-brutal">
        {market.description || "No description provided"}
      </div>

      {/* Market Stats */}
      <div className="market-stats-grid-brutal">
        <div className="stat-box-brutal">
          <div className="stat-box-label">STATUS</div>
          <div className={`stat-box-value status-${marketStatus.className}`}>
            {marketStatus.label}
          </div>
        </div>
        <div className="stat-box-brutal">
          <div className="stat-box-label">OPTIONS</div>
          <div className="stat-box-value">{market.options.length}</div>
        </div>
        {timeRemaining && (
          <div className="stat-box-brutal">
            <div className="stat-box-label">TIME LEFT</div>
            <div className="stat-box-value">{timeRemaining}</div>
          </div>
        )}
      </div>

      {/* View Market CTA */}
      <div className="view-market-cta-brutal">
        <span>VIEW MARKET</span>
        <span className="arrow-brutal">→</span>
      </div>
    </article>
  );
}
