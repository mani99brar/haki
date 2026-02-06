"use client";

import React, { ReactNode } from "react";
import { YellowProvider } from "@/context/YellowProvider";
import ContextProvider from "@/context"; // Your Reown/AppKit provider
import YellowConnectionManager from "@/components/YellowConnectionManager";

interface ProvidersProps {
  children: ReactNode;
  cookies: string | null;
}

export function Providers({ children, cookies }: ProvidersProps) {
  return (
    // Order matters: usually specific (Yellow) inside generic (AppKit)
    // or vice versa depending on dependencies.
    // Since Yellow uses Wallet, AppKit (Wallet) usually goes on the OUTSIDE.
    <ContextProvider cookies={cookies}>
      <YellowProvider>
        <YellowConnectionManager />
        {children}
      </YellowProvider>
    </ContextProvider>
  );
}
