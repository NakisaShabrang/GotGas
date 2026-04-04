import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GotGas - Find the Cheapest Gas Stations Near You",
  description: "Locate the most affordable gas stations in your area with GotGas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Top Navigation */}
        <header
          style={{
            backgroundColor: "#14532d",
            padding: "0 16px",
          }}
        >
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              maxWidth: "1200px",
              margin: "0 auto",
              height: "56px",
            }}
          >
            <strong style={{ fontSize: "20px", color: "#ffffff", marginRight: "auto" }}>GotGas</strong>
            <Link href="/predictions" className="nav-link">Predictions</Link>
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/map" className="nav-link">Map</Link>
            <Link href="/favorites" className="nav-link">Favorites</Link>
            <Link href="/login" className="nav-login">Profile</Link>
          </nav>
        </header>

        {/* Page Content */}
        <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}></main>
        {children}
      </body>
    </html>
  );
}
