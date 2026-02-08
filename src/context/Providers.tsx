"use client";

import React, { ReactNode } from "react";
import { YellowProvider } from "@/context/YellowProvider";
import ContextProvider from "@/context";
import { NotificationProvider } from "./NotificationContext";

interface ProvidersProps {
  children: ReactNode;
  cookies: string | null;
}

export function Providers({ children, cookies }: ProvidersProps) {
  return (
    <ContextProvider cookies={cookies}>
      <YellowProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </YellowProvider>
    </ContextProvider>
  );
}
