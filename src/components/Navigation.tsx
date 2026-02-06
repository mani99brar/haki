'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ConnectButton } from './ConnectButton';
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import { getEnsName } from "viem/actions";
import { Address } from "viem";
import { sepolia } from "viem/chains";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isConnected, address } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  const getActiveLink = () => {
    if (pathname === "/") return "Home";
    if (pathname === "/create") return "Create";
    return "Home";
  };

  const activeNavLink = getActiveLink();

  const handleNavigation = (link: string) => {
    if (link === "Home") router.push("/");
    else if (link === "Create") router.push("/create");
  };

  const handleDisconnect = async () => {
    // Handle wallet disconnect logic here
    console.log("Disconnecting wallet...");
    await disconnect();
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <nav className="top-nav">
      <div className="nav-left">
        <div
          className="logo"
          onClick={() => router.push("/")}
          style={{ cursor: "pointer" }}
        >
          HAKI
        </div>
        <div className="nav-links">
          {["Home", "Create"].map((link) => (
            <button
              key={link}
              className={`nav-link ${activeNavLink === link ? "active" : ""}`}
              onClick={() => handleNavigation(link)}
            >
              {link}
            </button>
          ))}
        </div>
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search predictions, people"
          />
        </div>
      </div>

      <div className="nav-right">
        <button className="icon-btn">
          <span style={{ fontSize: "20px" }}>🔔</span>
          <span className="badge"></span>
        </button>
        <button className="icon-btn">
          <span style={{ fontSize: "20px" }}>💬</span>
        </button>
        <div className="profile-dropdown-wrapper" ref={dropdownRef}>
          {!isConnected ? (
            <ConnectButton />
          ) : (
            <button
              className="profile-btn w-full"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {address!.slice(0, 5)}...{address!.slice(-3)}
            </button>
          )}
          {showDropdown && (
            <div className="profile-dropdown">
              <button
                className="dropdown-item"
                onClick={() => {
                  router.push("/profile");
                  setShowDropdown(false);
                }}
              >
                <span className="dropdown-icon">👤</span>
                Profile
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  router.push("/settings");
                  setShowDropdown(false);
                }}
              >
                <span className="dropdown-icon">⚙️</span>
                Settings
              </button>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item disconnect"
                onClick={handleDisconnect}
              >
                <span className="dropdown-icon">🔌</span>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
