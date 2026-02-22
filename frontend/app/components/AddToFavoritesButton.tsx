"use client";

import { useState } from "react";
import { addFavorite } from "@/app/lib/favorites";

export default function AddToFavoritesButton() {
  const [message, setMessage] = useState("");

  function handleAdd() {
    addFavorite({
      id: "demo-1",
      name: "Shell - Demo Station",
      address: "123 Tryon St, Charlotte, NC",
    });

    setMessage("Added to favorites!");
    setTimeout(() => setMessage(""), 2000);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={handleAdd}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          backgroundColor: "#14532d",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Add Demo Station to Favorites
      </button>

      {message && (
        <p style={{ marginTop: 10 }}>{message}</p>
      )}
    </div>
  );
}