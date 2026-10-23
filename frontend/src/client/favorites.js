const FAVORITES_KEY = "favorites";

export function readFavorites() {
  try {
    const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(favorites) ? favorites : [];
  } catch {
    return [];
  }
}

export function getFavoriteId(favorite) {
  if (typeof favorite === "string" || typeof favorite === "number") {
    return String(favorite);
  }

  const id = favorite?._id || favorite?.id;
  return id ? String(id) : "";
}

export function isFavorite(favorites, shoe) {
  const shoeId = getFavoriteId(shoe);
  return Boolean(
    shoeId &&
      favorites.some((favorite) => getFavoriteId(favorite) === shoeId),
  );
}

export function toggleFavorite(shoe) {
  const shoeId = getFavoriteId(shoe);
  if (!shoeId) return readFavorites();

  const favorites = readFavorites();
  const updatedFavorites = isFavorite(favorites, shoe)
    ? favorites.filter((favorite) => getFavoriteId(favorite) !== shoeId)
    : [
        ...favorites.filter(
          (favorite) => getFavoriteId(favorite) !== shoeId,
        ),
        shoe,
      ];

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
  window.dispatchEvent(new Event("favoritesUpdated"));
  return updatedFavorites;
}

export function removeFavorite(shoeId) {
  const updatedFavorites = readFavorites().filter(
    (favorite) => getFavoriteId(favorite) !== String(shoeId),
  );

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
  window.dispatchEvent(new Event("favoritesUpdated"));
  return updatedFavorites;
}
