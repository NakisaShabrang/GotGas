"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!user);
  }, [pathname]);

  return (
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

      {isLoggedIn ? (
        <Link href="/profile" className="nav-login">Profile</Link>
      ) : (
        <Link href="/login" className="nav-login">Login</Link>
      )}
    </nav>
  );
}
