import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "@/context/Providers"; // ✅ Import the wrapper

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Haki — Talk About Tomorrow",
  description: "Predictions, advice, and debates...",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side logic stays here
  const headersData = await headers();
  const cookies = headersData.get("cookie");

  return (
    <html
      lang="en"
      className={`${bricolageGrotesque.variable} ${manrope.variable}`}
    >
      <body>
        {/* Pass server data (cookies) to client wrapper */}
        <Providers cookies={cookies}>{children}</Providers>
      </body>
    </html>
  );
}
