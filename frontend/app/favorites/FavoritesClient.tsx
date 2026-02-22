"use client";

import { useEffect, useState } from "react";
import { FavoriteStation, loadFavorites, removeFavorite } from "@/app/lib/favorites";

export default function FavoritesClient() {
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  function handleRemove(id: string) {
    const updated = removeFavorite(id);
    setFavorites(updated);
  }

  if (favorites.length === 0) {
    return <p>You have no favorites yet.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
      {favorites.map((f) => (
        <li
          key={f.id}
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{f.name}</div>
            {f.address && (
              <div style={{ opacity: 0.8, fontSize: 13 }}>{f.address}</div>
            )}
          </div>

          <button
            onClick={() => handleRemove(f.id)}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}