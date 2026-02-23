export type FavoriteStation = {
  id: string;
  name: string;
  address?: string;
  createdAt: number;
};

const KEY = "gotgas:favorites";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

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

export function addFavorite(station: Omit<FavoriteStation, "createdAt">) {
  const favs = loadFavorites();
  if (favs.some((f) => f.id === station.id)) return favs;

  const updated: FavoriteStation[] = [
    { ...station, createdAt: Date.now() },
    ...favs,
  ];
  saveFavorites(updated);
  return updated;
}

export function removeFavorite(id: string) {
  const favs = loadFavorites();
  const updated = favs.filter((f) => f.id !== id);
  saveFavorites(updated);
  return updated;
}