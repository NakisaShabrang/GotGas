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

const KEY = "gotgas:favorites";
const GROUPS_KEY = "gotgas:favorite-groups";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
export const MAX_FAVORITE_NAME_LENGTH = 40;
export const MAX_FAVORITE_GROUP_NAME_LENGTH = 40;

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie ? document.cookie.split(";") : [];

  for (const chunk of cookies) {
    const cookie = chunk.trim();
    if (cookie.startsWith(encodedName)) {
      return decodeURIComponent(cookie.slice(encodedName.length));
    }
  }

  return null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

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

function normalizeGroupStationIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeFavoriteGroup(rawGroup: unknown): FavoriteGroup | null {
  if (!rawGroup || typeof rawGroup !== "object") {
    return null;
  }

  const candidate = rawGroup as Partial<FavoriteGroup>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.createdAt !== "number"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    createdAt: candidate.createdAt,
    stationIds: normalizeGroupStationIds(candidate.stationIds),
  };
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hasDuplicateGroupName(groups: FavoriteGroup[], name: string, excludeGroupId?: string) {
  const normalized = normalizeFavoriteGroupName(name).toLocaleLowerCase();
  return groups.some(
    (group) =>
      group.id !== excludeGroupId &&
      normalizeFavoriteGroupName(group.name).toLocaleLowerCase() === normalized
  );
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

  if (hasDuplicateGroupName(groups, normalized, excludeGroupId)) {
    return "A list with that name already exists.";
  }

  return "";
}

export function loadFavorites(): FavoriteStation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = getCookie(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favs: FavoriteStation[]) {
  setCookie(KEY, JSON.stringify(favs));
}

export function loadFavoriteGroups(): FavoriteGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = getCookie(GROUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((group) => normalizeFavoriteGroup(group))
      .filter((group): group is FavoriteGroup => group !== null);
  } catch {
    return [];
  }
}

export function saveFavoriteGroups(groups: FavoriteGroup[]) {
  setCookie(GROUPS_KEY, JSON.stringify(groups));
}

export function addFavorite(station: Omit<FavoriteStation, "createdAt">) {
  const favs = loadFavorites();
  if (favs.some((f) => f.id === station.id)) return favs;

  const updated: FavoriteStation[] = [
    { ...station, name: normalizeFavoriteName(station.name), createdAt: Date.now() },
    ...favs,
  ];
  saveFavorites(updated);
  return updated;
}

export function removeFavorite(id: string) {
  const favs = loadFavorites();
  const updated = favs.filter((f) => f.id !== id);
  saveFavorites(updated);
  const groups = loadFavoriteGroups();
  const updatedGroups = groups.map((group) => ({
    ...group,
    stationIds: group.stationIds.filter((stationId) => stationId !== id),
  }));
  saveFavoriteGroups(updatedGroups);
  return updated;
}

export function updateFavoriteName(id: string, name: string) {
  const normalized = normalizeFavoriteName(name);
  const favs = loadFavorites();

  if (!isValidFavoriteName(normalized)) {
    return favs;
  }

  const updated = favs.map((favorite) =>
    favorite.id === id ? { ...favorite, name: normalized } : favorite
  );

  saveFavorites(updated);
  return updated;
}

export function createFavoriteGroup(name: string) {
  const groups = loadFavoriteGroups();
  const error = getFavoriteGroupNameError(name, groups);

  if (error) {
    return groups;
  }

  const updated = [
    {
      id: createId("group"),
      name: normalizeFavoriteGroupName(name),
      stationIds: [],
      createdAt: Date.now(),
    },
    ...groups,
  ];

  saveFavoriteGroups(updated);
  return updated;
}

export function renameFavoriteGroup(id: string, name: string) {
  const groups = loadFavoriteGroups();
  const error = getFavoriteGroupNameError(name, groups, id);

  if (error) {
    return groups;
  }

  const normalized = normalizeFavoriteGroupName(name);
  const updated = groups.map((group) =>
    group.id === id ? { ...group, name: normalized } : group
  );

  saveFavoriteGroups(updated);
  return updated;
}

export function deleteFavoriteGroup(id: string) {
  const groups = loadFavoriteGroups();
  const updated = groups.filter((group) => group.id !== id);
  saveFavoriteGroups(updated);
  return updated;
}

export function addStationToFavoriteGroup(groupId: string, stationId: string) {
  const groups = loadFavoriteGroups();
  const updated = groups.map((group) => {
    if (group.id !== groupId || group.stationIds.includes(stationId)) {
      return group;
    }

    return { ...group, stationIds: [...group.stationIds, stationId] };
  });

  saveFavoriteGroups(updated);
  return updated;
}

export function removeStationFromFavoriteGroup(groupId: string, stationId: string) {
  const groups = loadFavoriteGroups();
  const updated = groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          stationIds: group.stationIds.filter((existingId) => existingId !== stationId),
        }
      : group
  );

  saveFavoriteGroups(updated);
  return updated;
}
