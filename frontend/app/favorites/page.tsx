import FavoritesClient from "./FavoritesClient";

export default function FavoritesPage() {
  return (
    <div style={{ padding: "48px 40px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Favorites
      </h1>
      <FavoritesClient />
    </div>
  );
}