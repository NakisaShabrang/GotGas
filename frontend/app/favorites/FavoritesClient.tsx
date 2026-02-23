"use client";

import { useState } from "react";
import {
  FavoriteStation,
  isValidFavoriteName,
  loadFavorites,
  MAX_FAVORITE_NAME_LENGTH,
  removeFavorite,
  updateFavoriteName,
} from "@/app/lib/favorites";

export default function FavoritesClient() {
  const [favorites, setFavorites] = useState<FavoriteStation[]>(() => loadFavorites());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [renameError, setRenameError] = useState("");

  function handleRemove(id: string) {
    const updated = removeFavorite(id);
    setFavorites(updated);

    if (editingId === id) {
      setEditingId(null);
      setDraftName("");
      setRenameError("");
    }
  }

  function handleStartRename(favorite: FavoriteStation) {
    setEditingId(favorite.id);
    setDraftName(favorite.name);
    setRenameError("");
  }

  function handleCancelRename() {
    setEditingId(null);
    setDraftName("");
    setRenameError("");
  }

  function handleConfirmRename(id: string) {
    if (!isValidFavoriteName(draftName)) {
      const trimmedLength = draftName.trim().length;
      if (trimmedLength === 0) {
        setRenameError("Please enter a valid station name.");
      } else {
        setRenameError(`Station name must be ${MAX_FAVORITE_NAME_LENGTH} characters or fewer.`);
      }
      return;
    }

    const updated = updateFavoriteName(id, draftName);
    setFavorites(updated);
    setEditingId(null);
    setDraftName("");
    setRenameError("");
  }

  if (favorites.length === 0) {
    return <p>You have no favorites yet.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
      {favorites.map((favorite) => {
        const isEditing = editingId === favorite.id;

        return (
          <li
            key={favorite.id}
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
            <div style={{ flex: 1 }}>
              {!isEditing && <div style={{ fontWeight: 700 }}>{favorite.name}</div>}

              {isEditing && (
                <div>
                  <label htmlFor={`favorite-rename-${favorite.id}`} style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                    Custom station name
                  </label>
                  <input
                    id={`favorite-rename-${favorite.id}`}
                    value={draftName}
                    onChange={(event) => {
                      setDraftName(event.target.value);
                      if (renameError) {
                        setRenameError("");
                      }
                    }}
                    maxLength={MAX_FAVORITE_NAME_LENGTH + 1}
                    style={{
                      width: "100%",
                      maxWidth: 320,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.35)",
                      background: "rgba(255,255,255,0.08)",
                      color: "white",
                    }}
                  />
                  {renameError && (
                    <p
                      role="alert"
                      style={{
                        marginTop: 8,
                        marginBottom: 0,
                        color: "#fecaca",
                        fontSize: 13,
                      }}
                    >
                      {renameError}
                    </p>
                  )}
                </div>
              )}

              {favorite.address && (
                <div style={{ opacity: 0.8, fontSize: 13, marginTop: !isEditing ? 0 : 8 }}>{favorite.address}</div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!isEditing && (
                <button
                  onClick={() => handleStartRename(favorite)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
              )}

              {isEditing && (
                <>
                  <button
                    onClick={() => handleConfirmRename(favorite.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "#14532d",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleCancelRename}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "transparent",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}

              <button
                onClick={() => handleRemove(favorite.id)}
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
