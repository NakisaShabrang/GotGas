export type FavoriteStation = {
  id: string;
  name: string;
  address?: string;
  createdAt: number;
};

export type FavoriteGroup = {
  id: string;
  name: string;
  stationIds: string[];
  createdAt: number;
};

const API_URL = "http://localhost:5000";
export const MAX_FAVORITE_NAME_LENGTH = 40;
export const MAX_FAVORITE_GROUP_NAME_LENGTH = 40;

export function normalizeFavoriteName(name: string) {
  return name.trim();
}

export function isValidFavoriteName(name: string) {
  const normalized = normalizeFavoriteName(name);
  return normalized.length > 0 && normalized.length <= MAX_FAVORITE_NAME_LENGTH;
}

export function normalizeFavoriteGroupName(name: string) {
  return name.trim();
}

export function isValidFavoriteGroupName(name: string) {
  const normalized = normalizeFavoriteGroupName(name);
  return normalized.length > 0 && normalized.length <= MAX_FAVORITE_GROUP_NAME_LENGTH;
}

export function getFavoriteGroupNameError(
  name: string,
  groups: FavoriteGroup[],
  excludeGroupId?: string
) {
  const normalized = normalizeFavoriteGroupName(name);

  if (normalized.length === 0) {
    return "Please enter a list name.";
  }

  if (normalized.length > MAX_FAVORITE_GROUP_NAME_LENGTH) {
    return `List name must be ${MAX_FAVORITE_GROUP_NAME_LENGTH} characters or fewer.`;
  }

  const duplicate = groups.some(
    (group) =>
      group.id !== excludeGroupId &&
      normalizeFavoriteGroupName(group.name).toLocaleLowerCase() === normalized.toLocaleLowerCase()
  );

  if (duplicate) {
    return "A list with that name already exists.";
  }

  return "";
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res;
}

export async function loadFavorites(): Promise<FavoriteStation[]> {
  try {
    const res = await apiFetch("/favorites");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function loadFavoriteGroups(): Promise<FavoriteGroup[]> {
  try {
    const res = await apiFetch("/favorite-groups");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function addFavorite(station: Omit<FavoriteStation, "createdAt">): Promise<FavoriteStation[]> {
  await apiFetch("/favorites", {
    method: "POST",
    body: JSON.stringify({ id: station.id, name: station.name, address: station.address }),
  });
  return loadFavorites();
}

export async function removeFavorite(id: string): Promise<FavoriteStation[]> {
  await apiFetch(`/favorites/${encodeURIComponent(id)}`, { method: "DELETE" });
  return loadFavorites();
}

export async function updateFavoriteName(id: string, name: string): Promise<FavoriteStation[]> {
  const normalized = normalizeFavoriteName(name);
  if (!isValidFavoriteName(normalized)) return loadFavorites();
  await apiFetch(`/favorites/${encodeURIComponent(id)}/name`, {
    method: "PUT",
    body: JSON.stringify({ name: normalized }),
  });
  return loadFavorites();
}

export async function createFavoriteGroup(name: string): Promise<FavoriteGroup[]> {
  await apiFetch("/favorite-groups", {
    method: "POST",
    body: JSON.stringify({ name: normalizeFavoriteGroupName(name) }),
  });
  return loadFavoriteGroups();
}

export async function renameFavoriteGroup(id: string, name: string): Promise<FavoriteGroup[]> {
  await apiFetch(`/favorite-groups/${encodeURIComponent(id)}/name`, {
    method: "PUT",
    body: JSON.stringify({ name: normalizeFavoriteGroupName(name) }),
  });
  return loadFavoriteGroups();
}

export async function deleteFavoriteGroup(id: string): Promise<FavoriteGroup[]> {
  await apiFetch(`/favorite-groups/${encodeURIComponent(id)}`, { method: "DELETE" });
  return loadFavoriteGroups();
}

export async function addStationToFavoriteGroup(groupId: string, stationId: string): Promise<FavoriteGroup[]> {
  await apiFetch(`/favorite-groups/${encodeURIComponent(groupId)}/stations/${encodeURIComponent(stationId)}`, {
    method: "POST",
  });
  return loadFavoriteGroups();
}

export async function removeStationFromFavoriteGroup(groupId: string, stationId: string): Promise<FavoriteGroup[]> {
  await apiFetch(`/favorite-groups/${encodeURIComponent(groupId)}/stations/${encodeURIComponent(stationId)}`, {
    method: "DELETE",
  });
  return loadFavoriteGroups();
}
