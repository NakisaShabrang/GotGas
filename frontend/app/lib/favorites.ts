export type FavoriteStation = {
  id: string;
  name: string;
  address?: string;
  createdAt: number;
};

const KEY = "gotgas:favorites";

export function loadFavorites(): FavoriteStation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favs: FavoriteStation[]) {
  localStorage.setItem(KEY, JSON.stringify(favs));
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