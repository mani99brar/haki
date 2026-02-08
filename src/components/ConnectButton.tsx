"use client";

import { useAppKit } from "@reown/appkit/react";

export const ConnectButton = () => {
  const { open } = useAppKit();

  return (
    <button
      onClick={() => open()}
      className="connect-btn-brutal" // <--- The magic class
    >
      <span className="connect-icon">⚡</span>
      CONNECT WALLET
    </button>
  );
};
