"use client";

import { useEffect, useState } from "react";

type UserProfile = {
  name?: string;
  email?: string;
  createdAt?: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      setUser(null);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch {
      setUser({ name: storedUser });
    }
  }, []);

  if (!user) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Profile</h1>

      <div style={{ marginTop: 20 }}>
        <p><strong>Username:</strong> {user.name || "Not provided"}</p>
        <p><strong>Email:</strong> {user.email || "Not provided"}</p>
        <p><strong>Member Since:</strong> {user.createdAt || "Not provided"}</p>
      </div>
    </div>
  );
}