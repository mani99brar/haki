'use client';

import { useState, useEffect } from "react";
import Navigation from '@/components/Navigation';
import UserMarketCard from "@/components/UserMarketCard";
import './profile.css';
import { useYellow } from "@/context/YellowProvider";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEnsName } from "wagmi";
import { sepolia } from "viem/chains";
import { Address } from "viem";
import { useAllMarkets } from "@/hooks/useAllMarkets";

export default function ProfilePage() {
  const { status, activeChannelId } = useYellow();
  const { address } = useAppKitAccount();

  // Get ENS name for the connected address
  const { data: ensName, isLoading: ensLoading } = useEnsName({
    address: address as Address | undefined,
    chainId: sepolia.id,
  });

  // Fetch all markets to determine which ones the user created or joined
  const { marketLabels } = useAllMarkets();

  useEffect(() => {
    console.log("INSI");
    console.log(activeChannelId);
  }, [activeChannelId]);

  // NOTE: In production, you would:
  // 1. Fetch the actual market.creator for each market from the contract
  // 2. Query Yellow Network to determine which markets the user has positions in
  // 3. Track user balances for each market via state channels
  // For now, we're using mock logic to demonstrate the UI
  const [participatedMarkets, setParticipatedMarkets] = useState<string[]>([]);
  const [createdMarkets, setCreatedMarkets] = useState<string[]>([]);

  useEffect(() => {
    // Simulate fetching user's market participation
    // TODO: Replace with actual logic:
    // - Query each market contract to check if market.creator === address
    // - Query Yellow Network state to find markets where user has positions
    if (marketLabels.length > 0 && address) {
      // Demo: alternate between created and participated for visual variety
      const created = marketLabels.filter((_, idx) => idx % 3 === 0);
      const participated = marketLabels.filter((_, idx) => idx % 3 !== 0);

      setCreatedMarkets(created);
      setParticipatedMarkets(participated);
    }
  }, [marketLabels, address]);

  // Display name: ENS > Truncated Address > "Connect Wallet"
  const displayName =
    ensName ||
    (address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : "Connect Wallet");

  return (
    <>
      <Navigation />

      <div className="profile-container">
        {/* Profile Hero */}
        <section className="profile-hero-brutal">
          <div className="hero-grid">
            <div className="profile-id-card">
              <div className="id-card-header">
                <div className="id-badge">TRADER ID</div>
                <div className="id-status">
                  <span className="status-dot"></span>
                  {status === "active" ? "ACTIVE" : "OFFLINE"}
                </div>
              </div>

              <div className="profile-display-name">
                {ensLoading ? (
                  <div className="name-skeleton">Loading...</div>
                ) : (
                  <>
                    <div className="ens-name">{displayName}</div>
                    {ensName && address && (
                      <div className="address-secondary">{`${address.slice(0, 8)}...${address.slice(-6)}`}</div>
                    )}
                  </>
                )}
              </div>

              <div className="profile-stats-brutal">
                <div className="stat-brutal">
                  <div className="stat-brutal-value">
                    {createdMarkets.length}
                  </div>
                  <div className="stat-brutal-label">CREATED</div>
                </div>
                <div className="stat-brutal-divider"></div>
                <div className="stat-brutal">
                  <div className="stat-brutal-value">
                    {participatedMarkets.length}
                  </div>
                  <div className="stat-brutal-label">JOINED</div>
                </div>
                <div className="stat-brutal-divider"></div>
                <div className="stat-brutal">
                  <div className="stat-brutal-value">
                    {createdMarkets.length + participatedMarkets.length}
                  </div>
                  <div className="stat-brutal-label">TOTAL</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Markets Section */}
        <section className="markets-section-brutal">
          <div className="markets-container">
            {/* Created Markets */}
            <div className="market-category">
              <div className="category-header">
                <div className="category-title-brutal">
                  <span className="category-icon">🏗️</span>
                  <h2>MARKETS CREATED</h2>
                  <div className="category-count">{createdMarkets.length}</div>
                </div>
                <div className="category-description">
                  Markets you've created and manage
                </div>
              </div>

              <div className="markets-grid-brutal">
                {createdMarkets.length === 0 ? (
                  <div className="empty-state-brutal">
                    <div className="empty-icon">📊</div>
                    <div className="empty-text">No markets created yet</div>
                    <div className="empty-subtext">
                      Create your first prediction market
                    </div>
                  </div>
                ) : (
                  createdMarkets.map((marketLabel) => (
                    <UserMarketCard
                      key={`created-${marketLabel}`}
                      marketLabel={marketLabel}
                      userAddress={address as Address}
                      isCreator={true}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Participated Markets */}
            <div className="market-category">
              <div className="category-header">
                <div className="category-title-brutal">
                  <span className="category-icon">🎯</span>
                  <h2>MARKETS JOINED</h2>
                  <div className="category-count">
                    {participatedMarkets.length}
                  </div>
                </div>
                <div className="category-description">
                  Markets where you hold positions
                </div>
              </div>

              <div className="markets-grid-brutal">
                {participatedMarkets.length === 0 ? (
                  <div className="empty-state-brutal">
                    <div className="empty-icon">🎲</div>
                    <div className="empty-text">No positions yet</div>
                    <div className="empty-subtext">
                      Start trading on prediction markets
                    </div>
                  </div>
                ) : (
                  participatedMarkets.map((marketLabel) => (
                    <UserMarketCard
                      key={`participated-${marketLabel}`}
                      marketLabel={marketLabel}
                      userAddress={address as Address}
                      isCreator={false}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
