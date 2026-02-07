'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ConnectButton } from './ConnectButton';
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";
import YellowStatus from "./YellowStatus";

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
    if (pathname === "/profile") return "Profile";
    return "Home";
  };

  const activeNavLink = getActiveLink();

  const handleNavigation = (link: string) => {
    if (link === "Home") router.push("/");
    else if (link === "Create") router.push("/create");
    else if (link === "Profile") router.push("/profile");
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
    <nav className="top-nav-brutal">
      <div className="nav-container-brutal">
        <div className="nav-left-brutal">
          <div className="logo-brutal" onClick={() => router.push("/")}>
            <span className="logo-icon">⬢</span>
            HAKI
          </div>
          <div className="nav-divider-brutal"></div>
          <div className="nav-links-brutal">
            {["Home", "Create", "Profile"].map((link) => (
              <button
                key={link}
                className={`nav-link-brutal ${activeNavLink === link ? "active" : ""}`}
                onClick={() => handleNavigation(link)}
              >
                {link}
              </button>
            ))}
          </div>
        </div>

        <div className="nav-right-brutal">
          {isConnected && <YellowStatus />}
          <div className="profile-section-brutal" ref={dropdownRef}>
            {!isConnected ? (
              <ConnectButton />
            ) : (
              <>
                <button
                  className="address-btn-brutal"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <span className="address-label">WALLET</span>
                  <span className="address-value">
                    {address!.slice(0, 6)}...{address!.slice(-4)}
                  </span>
                  <span className="dropdown-arrow">
                    {showDropdown ? "▲" : "▼"}
                  </span>
                </button>
                {showDropdown && (
                  <div className="dropdown-brutal">
                    <button
                      className="dropdown-item-brutal"
                      onClick={() => {
                        router.push("/profile");
                        setShowDropdown(false);
                      }}
                    >
                      <span className="dropdown-icon-brutal">👤</span>
                      <span className="dropdown-text">PROFILE</span>
                    </button>
                    <div className="dropdown-divider-brutal"></div>
                    <button
                      className="dropdown-item-brutal disconnect"
                      onClick={handleDisconnect}
                    >
                      <span className="dropdown-icon-brutal">🔌</span>
                      <span className="dropdown-text">DISCONNECT</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
