"use client";

import { useEffect, useState } from "react";
import {
  addStationToFavoriteGroup,
  createFavoriteGroup,
  deleteFavoriteNote,
  deleteFavoriteGroup,
  FavoriteGroup,
  FavoriteStation,
  getFavoriteGroupNameError,
  getFavoriteNoteError,
  isValidFavoriteName,
  loadFavoriteGroups,
  loadFavorites,
  MAX_FAVORITE_GROUP_NAME_LENGTH,
  MAX_FAVORITE_NAME_LENGTH,
  MAX_FAVORITE_NOTE_LENGTH,
  removeFavorite,
  removeStationFromFavoriteGroup,
  renameFavoriteGroup,
  updateFavoriteNote,
  updateFavoriteName,
} from "@/app/lib/favorites";
import { getVisitedStations, toggleVisitedStation, VisitedStation } from '@/app/lib/visited';

const cardStyle = {
  border: "1px solid rgba(128,128,128,0.3)",
  borderRadius: 12,
  padding: 16,
  background: "var(--background)",
  color: "var(--foreground)",
};

const favoriteCardStyle = {
  ...cardStyle,
  borderLeft: "4px solid #16a34a",
  paddingLeft: 14,
};

const groupCardStyle = {
  border: "1px solid rgba(22, 163, 74, 0.4)",
  borderRadius: 12,
  background: "var(--background)",
  color: "var(--foreground)",
  overflow: "hidden" as const,
};

const groupHeaderStyle = {
  background: "rgba(22, 163, 74, 0.08)",
  borderBottom: "1px solid rgba(22, 163, 74, 0.2)",
  padding: "12px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap" as const,
};

const groupBodyStyle = {
  padding: "12px 16px",
};

const stationRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  background: "rgba(22, 163, 74, 0.04)",
  border: "1px solid rgba(22, 163, 74, 0.15)",
  borderRadius: 8,
  padding: "10px 12px",
};

const secondaryButtonStyle = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid rgba(128,128,128,0.35)",
  background: "var(--background)",
  color: "#16a34a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const dangerButtonStyle = {
  ...secondaryButtonStyle,
  color: "#b91c1c",
  borderColor: "rgba(185, 28, 28, 0.3)",
};

const primaryButtonStyle = {
  ...secondaryButtonStyle,
  background: "#14532d",
  borderColor: "#14532d",
  color: "#ffffff",
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

const noteTextStyle = {
  margin: "6px 0 0",
  fontSize: 13,
  overflowWrap: "anywhere" as const,
  opacity: 0.85,
  fontStyle: "italic" as const,
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 72,
  resize: "vertical" as const,
};

export default function FavoritesClient() {
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [groups, setGroups] = useState<FavoriteGroup[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteError, setNoteError] = useState("");
  const [visitedStations, setVisitedStations] = useState<VisitedStation[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [favs, grps] = await Promise.all([loadFavorites(), loadFavoriteGroups()]);
      setFavorites(favs);
      setGroups(grps);
      setVisitedStations(getVisitedStations());
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleRemove(id: string) {
    const updated = await removeFavorite(id);
    setFavorites(updated);
    setGroups(await loadFavoriteGroups());

    if (editingId === id) {
      setEditingId(null);
      setDraftName("");
      setRenameError("");
    }

    if (expandedFavoriteId === id) {
      setExpandedFavoriteId(null);
    }

    if (noteEditingId === id) {
      handleCancelNote();
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

  async function handleConfirmRename(id: string) {
    if (!isValidFavoriteName(draftName)) {
      const trimmedLength = draftName.trim().length;
      if (trimmedLength === 0) {
        setRenameError("Please enter a valid station name.");
      } else {
        setRenameError(`Station name must be ${MAX_FAVORITE_NAME_LENGTH} characters or fewer.`);
      }
      return;
    }

    const updated = await updateFavoriteName(id, draftName);
    setFavorites(updated);
    setEditingId(null);
    setDraftName("");
    setRenameError("");
  }

  async function handleCreateGroup() {
    const error = getFavoriteGroupNameError(newGroupName, groups);
    if (error) {
      setNewGroupError(error);
      return;
    }

    const updated = await createFavoriteGroup(newGroupName);
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

  async function handleConfirmGroupRename(groupId: string) {
    const error = getFavoriteGroupNameError(groupRenameDraft, groups, groupId);
    if (error) {
      setGroupRenameError(error);
      return;
    }

    const updated = await renameFavoriteGroup(groupId, groupRenameDraft);
    setGroups(updated);
    handleCancelGroupRename();
  }

  async function handleDeleteGroup(groupId: string) {
    const updated = await deleteFavoriteGroup(groupId);
    setGroups(updated);

    if (groupRenameId === groupId) {
      handleCancelGroupRename();
    }
  }

  async function handleAddStationToGroup(groupId: string, stationId: string) {
    const updated = await addStationToFavoriteGroup(groupId, stationId);
    setGroups(updated);
  }

  async function handleRemoveStationFromGroup(groupId: string, stationId: string) {
    const updated = await removeStationFromFavoriteGroup(groupId, stationId);
    setGroups(updated);
  }

  function handleStartNote(favorite: FavoriteStation) {
    setNoteEditingId(favorite.id);
    setNoteDraft(favorite.note ?? "");
    setNoteError("");
  }

  function handleCancelNote() {
    setNoteEditingId(null);
    setNoteDraft("");
    setNoteError("");
  }

  async function handleSaveNote(stationId: string) {
    const error = getFavoriteNoteError(noteDraft);
    if (error) {
      setNoteError(error);
      return;
    }

    const updated = await updateFavoriteNote(stationId, noteDraft);
    setFavorites(updated);
    handleCancelNote();
  }

  async function handleDeleteNote(stationId: string) {
    const updated = await deleteFavoriteNote(stationId);
    setFavorites(updated);

    if (noteEditingId === stationId) {
      handleCancelNote();
    }
  }

  function renderNote(favorite: FavoriteStation) {
    const isEditingNote = noteEditingId === favorite.id;

    if (isEditingNote) {
      return (
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <label htmlFor={`favorite-note-${favorite.id}`} style={{ fontSize: 13 }}>
            Station note
          </label>
          <textarea
            id={`favorite-note-${favorite.id}`}
            value={noteDraft}
            onChange={(event) => {
              setNoteDraft(event.target.value);
              if (noteError) {
                setNoteError("");
              }
            }}
            maxLength={MAX_FAVORITE_NOTE_LENGTH}
            style={textareaStyle}
          />
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {noteDraft.length}/{MAX_FAVORITE_NOTE_LENGTH}
          </div>
          {noteError && (
            <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
              {noteError}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => handleSaveNote(favorite.id)}
              style={primaryButtonStyle}
            >
              Save Note
            </button>
            <button onClick={handleCancelNote} style={secondaryButtonStyle}>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (!favorite.note) {
      return null;
    }

    return <p style={noteTextStyle}>Note: {favorite.note}</p>;
  }

  function renderNoteActions(favorite: FavoriteStation) {
    if (noteEditingId === favorite.id) {
      return null;
    }

    return (
      <>
        <button onClick={() => handleStartNote(favorite)} style={secondaryButtonStyle}>
          {favorite.note ? "Edit Note" : "Add Note"}
        </button>
        {favorite.note && (
          <button onClick={() => handleDeleteNote(favorite.id)} style={secondaryButtonStyle}>
            Delete Note
          </button>
        )}
      </>
    );
  }

  if (loading) {
    return <p style={{ opacity: 0.8 }}>Loading favorites...</p>;
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
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>My Lists</h2>
            <p style={{ margin: "4px 0 0", opacity: 0.8 }}>
              Organize your saved stations into groups.
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
                style={primaryButtonStyle}
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
          <div style={{ display: "grid", gap: 16 }}>
            {groups.map((group) => {
              const stations = group.stationIds
                .map((stationId) => favorites.find((favorite) => favorite.id === stationId))
                .filter((station): station is FavoriteStation => Boolean(station));
              const isRenamingGroup = groupRenameId === group.id;

              return (
                <div key={group.id} style={groupCardStyle}>
                  <div style={groupHeaderStyle}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      {!isRenamingGroup && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18, fontWeight: 700 }}>{group.name}</span>
                          <span style={{
                            background: "#16a34a",
                            color: "#fff",
                            borderRadius: 20,
                            padding: "2px 9px",
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {stations.length} station{stations.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

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
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!isRenamingGroup && (
                        <button onClick={() => handleStartGroupRename(group)} style={secondaryButtonStyle}>
                          Rename
                        </button>
                      )}
                      {isRenamingGroup && (
                        <>
                          <button onClick={() => handleConfirmGroupRename(group.id)} style={primaryButtonStyle}>
                            Save
                          </button>
                          <button onClick={handleCancelGroupRename} style={secondaryButtonStyle}>
                            Cancel
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDeleteGroup(group.id)} style={dangerButtonStyle}>
                        Delete List
                      </button>
                    </div>
                  </div>

                  <div style={groupBodyStyle}>
                    {stations.length === 0 && (
                      <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
                        No stations in this list yet. Use "Add to List" on any favorite below.
                      </p>
                    )}

                    {stations.length > 0 && (
                      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8, counterReset: "station-counter" }}>
                        {stations.map((station, index) => (
                          <li key={`${group.id}-${station.id}`} style={stationRowStyle}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
                              <span style={{
                                background: "#16a34a",
                                color: "#fff",
                                borderRadius: "50%",
                                width: 24,
                                height: 24,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                                marginTop: 1,
                              }}>
                                {index + 1}
                              </span>
                              <div>
                                <div style={{ fontWeight: 600 }}>{station.name}</div>
                                {station.address && (
                                  <div style={{ opacity: 0.75, fontSize: 13, marginTop: 2 }}>{station.address}</div>
                                )}
                                {renderNote(station)}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
                              {renderNoteActions(station)}
                              <button
                                onClick={() => handleRemoveStationFromGroup(group.id, station.id)}
                                style={dangerButtonStyle}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Saved Stations</h2>
          <p style={{ margin: "4px 0 0", opacity: 0.8 }}>
            Use "Add to List" to organize stations into groups.
          </p>
        </div>

        {!hasFavorites && <p style={{ margin: 0, opacity: 0.7 }}>You have no favorites yet. Save a station from the map to get started.</p>}

        {hasFavorites && (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12, margin: 0 }}>
            {favorites.map((favorite) => {
              const isEditing = editingId === favorite.id;
              const isExpanded = expandedFavoriteId === favorite.id;
              const memberOfGroups = groups.filter(g => g.stationIds.includes(favorite.id));

              return (
                <li key={favorite.id} style={{ ...favoriteCardStyle, display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {!isEditing && (
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{favorite.name}</div>
                      )}

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
                        <div style={{ opacity: 0.75, fontSize: 13, marginTop: 2 }}>
                          {favorite.address}
                        </div>
                      )}

                      {memberOfGroups.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {memberOfGroups.map(g => (
                            <span key={g.id} style={{
                              background: "rgba(22, 163, 74, 0.12)",
                              border: "1px solid rgba(22, 163, 74, 0.3)",
                              color: "#15803d",
                              borderRadius: 20,
                              padding: "2px 9px",
                              fontSize: 12,
                              fontWeight: 500,
                            }}>
                              {g.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {renderNote(favorite)}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
                      {!isEditing && (
                        <button
                          onClick={() =>
                            setExpandedFavoriteId((current) => (current === favorite.id ? null : favorite.id))
                          }
                          aria-label={`Add ${favorite.name} to a list`}
                          style={secondaryButtonStyle}
                        >
                          {isExpanded ? "Cancel" : "Add to List"}
                        </button>
                      )}

                      {!isEditing && (
                        <button onClick={() => handleStartRename(favorite)} style={secondaryButtonStyle}>
                          Rename
                        </button>
                      )}

                      {!isEditing && renderNoteActions(favorite)}

                      {isEditing && (
                        <>
                          <button onClick={() => handleConfirmRename(favorite.id)} style={primaryButtonStyle}>
                            Save
                          </button>
                          <button onClick={handleCancelRename} style={secondaryButtonStyle}>
                            Cancel
                          </button>
                        </>
                      )}

                      <button onClick={() => handleRemove(favorite.id)} style={dangerButtonStyle}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      borderTop: "1px solid rgba(22, 163, 74, 0.2)",
                      paddingTop: 12,
                      background: "rgba(22, 163, 74, 0.03)",
                      borderRadius: "0 0 8px 8px",
                      marginLeft: -14,
                      marginRight: -16,
                      marginBottom: -16,
                      paddingLeft: 14,
                      paddingRight: 16,
                      paddingBottom: 14,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, opacity: 0.8 }}>
                        Add "{favorite.name}" to a list:
                      </div>
                      {!hasGroups && (
                        <p style={{ margin: 0, opacity: 0.7, fontSize: 13 }}>No lists yet — create one above first.</p>
                      )}

                      {hasGroups && (
                        <div style={{ display: "grid", gap: 8 }}>
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
                                  padding: "8px 10px",
                                  borderRadius: 8,
                                  border: "1px solid rgba(128,128,128,0.2)",
                                  background: isInGroup ? "rgba(22, 163, 74, 0.07)" : "var(--background)",
                                }}
                              >
                                <span style={{ fontWeight: 500 }}>{group.name}</span>
                                <button
                                  onClick={() => !isInGroup && handleAddStationToGroup(group.id, favorite.id)}
                                  disabled={isInGroup}
                                  style={{
                                    ...secondaryButtonStyle,
                                    opacity: isInGroup ? 1 : 1,
                                    cursor: isInGroup ? "default" : "pointer",
                                    background: isInGroup ? "rgba(22, 163, 74, 0.15)" : "var(--background)",
                                    color: isInGroup ? "#15803d" : "#16a34a",
                                    borderColor: isInGroup ? "rgba(22, 163, 74, 0.4)" : "rgba(128,128,128,0.35)",
                                  }}
                                >
                                  {isInGroup ? "✓ In this list" : "Add to List"}
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

      {visitedStations.length > 0 && (
        <section style={{ display: "grid", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Visited Stations</h2>
            <p style={{ margin: "4px 0 0", opacity: 0.8 }}>
              Stations you have marked as visited.
            </p>
          </div>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12, margin: 0 }}>
            {visitedStations.map((station) => (
              <li key={station.id} style={{ ...favoriteCardStyle }}>
                <strong>{station.name}</strong>
                {station.address && (
                  <div style={{ marginTop: 4, opacity: 0.8, fontSize: 13 }}>
                    {station.address}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => {
                      toggleVisitedStation(station);
                      setVisitedStations(getVisitedStations());
                    }}
                    style={dangerButtonStyle}
                  >
                    Remove from Visited
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
