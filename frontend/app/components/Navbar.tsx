"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!user);
  }, []);

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <strong style={{ fontSize: "18px" }}>GotGas</strong>
      <Link href="/">Home</Link>
      <Link href="/map">Map</Link>
      <Link href="/favorites">Favorites</Link>

      {isLoggedIn ? (
        <Link href="/profile">Profile</Link>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </nav>
  );
}