'use client';

import { useState, useEffect, useMemo } from "react";
import Navigation from '@/components/Navigation';
import UserMarketCard from "@/components/UserMarketCard";
import './profile.css';
import { useYellow } from "@/context/YellowProvider";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEnsName } from "wagmi";
import { sepolia } from "viem/chains";
import { Address } from "viem";
import { useAllMarkets } from "@/hooks/useAllMarkets";
import { useYellowActions } from "@/hooks/yellow/useYellowActions";

export default function ProfilePage() {
  const { address } = useAppKitAccount();
  const { markets, isLoading: marketsLoading } = useAllMarkets();
  const { balance } = useYellowActions(address as Address);

  // Filter: Only show markets where the connected user is the creator
  const userCreatedMarkets = useMemo(() => {
    if (!markets || !address) return [];
    return markets.filter(
      (m) => m.creator.toLowerCase() === address.toLowerCase(),
    );
  }, [markets, address]);

  return (
    <div className="profile-container">
      <Navigation />

      <section className="profile-hero-brutal">
        <div className="hero-grid">
          <div className="profile-id-card">
            <div className="profile-display-name">
              <div className="ens-name">{/* ENS Logic here */}</div>
            </div>

            <div className="profile-stats-brutal">
              <div className="stat-brutal">
                <div className="stat-brutal-value">
                  {userCreatedMarkets.length}
                </div>
                <div className="stat-brutal-label">CREATED</div>
              </div>

              <div className="stat-brutal-divider"></div>

              <div className="stat-brutal">
                <div className="stat-brutal-value">
                  {balance ? parseFloat(balance).toFixed(3) : "0.00"}
                </div>
                <div className="stat-brutal-label">{"YTEST.USD"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="markets-section-brutal">
        <div className="category-header">
          <div className="category-title-brutal">
            <h2>MARKETS CREATED</h2>
          </div>
        </div>

        <div className="markets-grid-brutal">
          {marketsLoading && userCreatedMarkets.length === 0 ? (
            <div className="loading-brutal">SCANNING BLOCKCHAIN...</div>
          ) : userCreatedMarkets.length === 0 ? (
            <div className="empty-state">
              No markets created by this address.
            </div>
          ) : (
            userCreatedMarkets.map((market) => (
              <UserMarketCard
                key={market.node}
                marketLabel={market.label}
                userAddress={address as Address}
                isCreator={true}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
