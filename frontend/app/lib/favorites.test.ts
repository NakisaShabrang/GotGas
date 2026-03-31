import {
  addFavorite,
  removeFavorite,
  loadFavorites,
  saveFavorites,
  updateFavoriteName,
  normalizeFavoriteName,
  isValidFavoriteName,
  FavoriteStation,
  MAX_FAVORITE_NAME_LENGTH,
} from '@/app/lib/favorites';

describe('favorites utility functions', () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; max-age=0; path=/`;
    });
  });

  describe('normalizeFavoriteName', () => {
    it('trims whitespace from the name', () => {
      expect(normalizeFavoriteName('  Shell Station  ')).toBe('Shell Station');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(normalizeFavoriteName('   ')).toBe('');
    });
  });

  describe('isValidFavoriteName', () => {
    it('returns true for a valid name', () => {
      expect(isValidFavoriteName('Shell Station')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidFavoriteName('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isValidFavoriteName('   ')).toBe(false);
    });

    it('returns false for a name exceeding max length', () => {
      expect(isValidFavoriteName('x'.repeat(MAX_FAVORITE_NAME_LENGTH + 1))).toBe(false);
    });

    it('returns true for name at exactly max length', () => {
      expect(isValidFavoriteName('x'.repeat(MAX_FAVORITE_NAME_LENGTH))).toBe(true);
    });
  });

  describe('loadFavorites', () => {
    it('returns empty array when no cookie is set', () => {
      expect(loadFavorites()).toEqual([]);
    });

    it('returns saved favorites from cookie', () => {
      const favorites: FavoriteStation[] = [
        { id: '1', name: 'Station A', createdAt: 1000 },
      ];
      saveFavorites(favorites);
      expect(loadFavorites()).toEqual(favorites);
    });

    it('returns empty array for invalid JSON in cookie', () => {
      document.cookie = `${encodeURIComponent('gotgas:favorites')}=not-json; path=/`;
      expect(loadFavorites()).toEqual([]);
    });
  });

  describe('addFavorite', () => {
    it('adds a new favorite to the list', () => {
      const result = addFavorite({ id: 'station-1', name: 'BP Gas', address: '123 Main St' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('station-1');
      expect(result[0].name).toBe('BP Gas');
      expect(result[0].address).toBe('123 Main St');
      expect(result[0].createdAt).toBeGreaterThan(0);
    });

    it('does not add a duplicate favorite', () => {
      addFavorite({ id: 'station-1', name: 'BP Gas' });
      const result = addFavorite({ id: 'station-1', name: 'BP Gas' });
      expect(result).toHaveLength(1);
    });

    it('prepends new favorites to the front of the list', () => {
      addFavorite({ id: 'station-1', name: 'First' });
      const result = addFavorite({ id: 'station-2', name: 'Second' });
      expect(result[0].name).toBe('Second');
      expect(result[1].name).toBe('First');
    });

    it('trims the name before saving', () => {
      const result = addFavorite({ id: 'station-1', name: '  Shell  ' });
      expect(result[0].name).toBe('Shell');
    });
  });

  describe('removeFavorite', () => {
    it('removes a favorite by id', () => {
      addFavorite({ id: 'station-1', name: 'Shell' });
      addFavorite({ id: 'station-2', name: 'BP' });
      const result = removeFavorite('station-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('station-2');
    });

    it('returns empty array when removing the only favorite', () => {
      addFavorite({ id: 'station-1', name: 'Shell' });
      const result = removeFavorite('station-1');
      expect(result).toEqual([]);
    });

    it('does nothing when id does not exist', () => {
      addFavorite({ id: 'station-1', name: 'Shell' });
      const result = removeFavorite('nonexistent');
      expect(result).toHaveLength(1);
    });
  });

  describe('updateFavoriteName', () => {
    it('updates the name of an existing favorite', () => {
      addFavorite({ id: 'station-1', name: 'Old Name' });
      const result = updateFavoriteName('station-1', 'New Name');
      expect(result[0].name).toBe('New Name');
    });

    it('does not update if the new name is invalid (empty)', () => {
      addFavorite({ id: 'station-1', name: 'Shell' });
      const result = updateFavoriteName('station-1', '   ');
      expect(result[0].name).toBe('Shell');
    });

    it('does not update if the new name exceeds max length', () => {
      addFavorite({ id: 'station-1', name: 'Shell' });
      const result = updateFavoriteName('station-1', 'x'.repeat(MAX_FAVORITE_NAME_LENGTH + 1));
      expect(result[0].name).toBe('Shell');
    });

    it('does not modify other favorites', () => {
      addFavorite({ id: 'station-1', name: 'Shell' });
      addFavorite({ id: 'station-2', name: 'BP' });
      const result = updateFavoriteName('station-1', 'Updated Shell');
      const bp = result.find((f) => f.id === 'station-2');
      expect(bp?.name).toBe('BP');
    });
  });
});
