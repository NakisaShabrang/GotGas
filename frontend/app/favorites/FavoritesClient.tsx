"use client";

import { useState } from "react";
import {
  addStationToFavoriteGroup,
  createFavoriteGroup,
  deleteFavoriteGroup,
  FavoriteGroup,
  FavoriteStation,
  getFavoriteGroupNameError,
  isValidFavoriteName,
  loadFavoriteGroups,
  loadFavorites,
  MAX_FAVORITE_GROUP_NAME_LENGTH,
  MAX_FAVORITE_NAME_LENGTH,
  removeFavorite,
  removeStationFromFavoriteGroup,
  renameFavoriteGroup,
  updateFavoriteName,
} from "@/app/lib/favorites";

const cardStyle = {
  border: "1px solid rgba(128,128,128,0.3)",
  borderRadius: 12,
  padding: 12,
  background: "var(--background)",
  color: "var(--foreground)",
};

const secondaryButtonStyle = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(128,128,128,0.3)",
  background: "var(--background)",
  color: "#16a34a",
  cursor: "pointer",
};

const inputStyle = {
  width: "100%",
  maxWidth: 320,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(128,128,128,0.3)",
  background: "var(--background)",
  color: "var(--foreground)",
};

export default function FavoritesClient() {
  const [favorites, setFavorites] = useState<FavoriteStation[]>(() => loadFavorites());
  const [groups, setGroups] = useState<FavoriteGroup[]>(() => loadFavoriteGroups());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupError, setNewGroupError] = useState("");
  const [groupRenameId, setGroupRenameId] = useState<string | null>(null);
  const [groupRenameDraft, setGroupRenameDraft] = useState("");
  const [groupRenameError, setGroupRenameError] = useState("");
  const [expandedFavoriteId, setExpandedFavoriteId] = useState<string | null>(null);

  function handleRemove(id: string) {
    const updated = removeFavorite(id);
    setFavorites(updated);
    setGroups(loadFavoriteGroups());

    if (editingId === id) {
      setEditingId(null);
      setDraftName("");
      setRenameError("");
    }

    if (expandedFavoriteId === id) {
      setExpandedFavoriteId(null);
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

  function handleCreateGroup() {
    const error = getFavoriteGroupNameError(newGroupName, groups);
    if (error) {
      setNewGroupError(error);
      return;
    }

    const updated = createFavoriteGroup(newGroupName);
    setGroups(updated);
    setIsCreatingGroup(false);
    setNewGroupName("");
    setNewGroupError("");
  }

  function handleStartGroupRename(group: FavoriteGroup) {
    setGroupRenameId(group.id);
    setGroupRenameDraft(group.name);
    setGroupRenameError("");
  }

  function handleCancelGroupRename() {
    setGroupRenameId(null);
    setGroupRenameDraft("");
    setGroupRenameError("");
  }

  function handleConfirmGroupRename(groupId: string) {
    const error = getFavoriteGroupNameError(groupRenameDraft, groups, groupId);
    if (error) {
      setGroupRenameError(error);
      return;
    }

    const updated = renameFavoriteGroup(groupId, groupRenameDraft);
    setGroups(updated);
    handleCancelGroupRename();
  }

  function handleDeleteGroup(groupId: string) {
    const updated = deleteFavoriteGroup(groupId);
    setGroups(updated);

    if (groupRenameId === groupId) {
      handleCancelGroupRename();
    }
  }

  function handleAddStationToGroup(groupId: string, stationId: string) {
    const updated = addStationToFavoriteGroup(groupId, stationId);
    setGroups(updated);
  }

  function handleRemoveStationFromGroup(groupId: string, stationId: string) {
    const updated = removeStationFromFavoriteGroup(groupId, stationId);
    setGroups(updated);
  }

  const hasFavorites = favorites.length > 0;
  const hasGroups = groups.length > 0;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Lists</h2>
            <p style={{ margin: "4px 0 0", opacity: 0.8 }}>
              Create custom groups for home, work, and travel stops.
            </p>
          </div>
          <button onClick={() => setIsCreatingGroup((current) => !current)} style={secondaryButtonStyle}>
            Create New List
          </button>
        </div>

        {isCreatingGroup && (
          <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
            <label htmlFor="new-group-name" style={{ fontSize: 13 }}>
              List name
            </label>
            <input
              id="new-group-name"
              value={newGroupName}
              onChange={(event) => {
                setNewGroupName(event.target.value);
                if (newGroupError) {
                  setNewGroupError("");
                }
              }}
              maxLength={MAX_FAVORITE_GROUP_NAME_LENGTH + 1}
              style={inputStyle}
            />
            {newGroupError && (
              <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
                {newGroupError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={handleCreateGroup}
                style={{ ...secondaryButtonStyle, background: "#14532d", borderColor: "#14532d", color: "#ffffff" }}
              >
                Save List
              </button>
              <button
                onClick={() => {
                  setIsCreatingGroup(false);
                  setNewGroupName("");
                  setNewGroupError("");
                }}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!hasGroups && <p style={{ margin: 0 }}>No lists yet. Create one to organize your favorite stations.</p>}

        {hasGroups && (
          <div style={{ display: "grid", gap: 12 }}>
            {groups.map((group) => {
              const stations = group.stationIds
                .map((stationId) => favorites.find((favorite) => favorite.id === stationId))
                .filter((station): station is FavoriteStation => Boolean(station));
              const isRenamingGroup = groupRenameId === group.id;

              return (
                <div key={group.id} style={{ ...cardStyle, display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 220 }}>
                      {!isRenamingGroup && <div style={{ fontSize: 18, fontWeight: 700 }}>{group.name}</div>}

                      {isRenamingGroup && (
                        <div style={{ display: "grid", gap: 8 }}>
                          <label htmlFor={`rename-group-${group.id}`} style={{ fontSize: 13 }}>
                            Rename list
                          </label>
                          <input
                            id={`rename-group-${group.id}`}
                            value={groupRenameDraft}
                            onChange={(event) => {
                              setGroupRenameDraft(event.target.value);
                              if (groupRenameError) {
                                setGroupRenameError("");
                              }
                            }}
                            maxLength={MAX_FAVORITE_GROUP_NAME_LENGTH + 1}
                            style={inputStyle}
                          />
                          {groupRenameError && (
                            <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
                              {groupRenameError}
                            </p>
                          )}
                        </div>
                      )}

                      <p style={{ margin: "4px 0 0", opacity: 0.8, fontSize: 13 }}>
                        {stations.length === 0
                          ? "No stations in this list yet."
                          : `${stations.length} station${stations.length === 1 ? "" : "s"} in this list.`}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!isRenamingGroup && (
                        <button onClick={() => handleStartGroupRename(group)} style={secondaryButtonStyle}>
                          Rename
                        </button>
                      )}
                      {isRenamingGroup && (
                        <>
                          <button
                            onClick={() => handleConfirmGroupRename(group.id)}
                            style={{ ...secondaryButtonStyle, background: "#14532d", borderColor: "#14532d", color: "#ffffff" }}
                          >
                            Save
                          </button>
                          <button onClick={handleCancelGroupRename} style={secondaryButtonStyle}>
                            Cancel
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDeleteGroup(group.id)} style={secondaryButtonStyle}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {stations.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                      {stations.map((station) => (
                        <li
                          key={`${group.id}-${station.id}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            alignItems: "center",
                            borderTop: "1px solid rgba(128,128,128,0.2)",
                            paddingTop: 8,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{station.name}</div>
                            {station.address && <div style={{ opacity: 0.8, fontSize: 13 }}>{station.address}</div>}
                          </div>
                          <button
                            onClick={() => handleRemoveStationFromGroup(group.id, station.id)}
                            style={secondaryButtonStyle}
                          >
                            Remove from List
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>All Favorites</h2>
          <p style={{ margin: "4px 0 0", opacity: 0.8 }}>
            Keep every saved station here, then add each stop to one or more lists.
          </p>
        </div>

        {!hasFavorites && <p style={{ margin: 0 }}>You have no favorites yet.</p>}

        {hasFavorites && (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12, margin: 0 }}>
            {favorites.map((favorite) => {
              const isEditing = editingId === favorite.id;
              const isExpanded = expandedFavoriteId === favorite.id;

              return (
                <li key={favorite.id} style={{ ...cardStyle, display: "grid", gap: 12 }}>
                  <div
                    style={{
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
                          <label
                            htmlFor={`favorite-rename-${favorite.id}`}
                            style={{ display: "block", fontSize: 13, marginBottom: 6 }}
                          >
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
                            style={inputStyle}
                          />
                          {renameError && (
                            <p role="alert" style={{ marginTop: 8, marginBottom: 0, color: "#b91c1c", fontSize: 13 }}>
                              {renameError}
                            </p>
                          )}
                        </div>
                      )}

                      {favorite.address && (
                        <div style={{ opacity: 0.8, fontSize: 13, marginTop: !isEditing ? 0 : 8 }}>
                          {favorite.address}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {!isEditing && (
                        <button
                          onClick={() =>
                            setExpandedFavoriteId((current) => (current === favorite.id ? null : favorite.id))
                          }
                          aria-label={`Add ${favorite.name} to a list`}
                          style={secondaryButtonStyle}
                        >
                          +
                        </button>
                      )}

                      {!isEditing && (
                        <button onClick={() => handleStartRename(favorite)} style={secondaryButtonStyle}>
                          Edit
                        </button>
                      )}

                      {isEditing && (
                        <>
                          <button
                            onClick={() => handleConfirmRename(favorite.id)}
                            style={{ ...secondaryButtonStyle, background: "#14532d", borderColor: "#14532d", color: "#ffffff" }}
                          >
                            Confirm
                          </button>
                          <button onClick={handleCancelRename} style={secondaryButtonStyle}>
                            Cancel
                          </button>
                        </>
                      )}

                      <button onClick={() => handleRemove(favorite.id)} style={secondaryButtonStyle}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: 12 }}>
                      {!hasGroups && (
                        <p style={{ margin: 0 }}>Create a list first, then add this station to it.</p>
                      )}

                      {hasGroups && (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontSize: 13, opacity: 0.8 }}>Add this station to a list</div>
                          {groups.map((group) => {
                            const isInGroup = group.stationIds.includes(favorite.id);

                            return (
                              <div
                                key={`${favorite.id}-${group.id}`}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 12,
                                }}
                              >
                                <span>{group.name}</span>
                                <button
                                  onClick={() => handleAddStationToGroup(group.id, favorite.id)}
                                  disabled={isInGroup}
                                  style={{
                                    ...secondaryButtonStyle,
                                    opacity: isInGroup ? 0.6 : 1,
                                    cursor: isInGroup ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {isInGroup ? "Added" : "Add to List"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
