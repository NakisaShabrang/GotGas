const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  loadFavorites,
  loadFavoriteGroups,
  addFavorite,
  removeFavorite,
  updateFavoriteName,
  createFavoriteGroup,
  renameFavoriteGroup,
  deleteFavoriteGroup,
  addStationToFavoriteGroup,
  removeStationFromFavoriteGroup,
  isValidFavoriteName,
  isValidFavoriteGroupName,
  getFavoriteGroupNameError,
  normalizeFavoriteName,
  normalizeFavoriteGroupName,
} from '@/app/lib/favorites';

function mockJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}

describe('favorites API lib', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // --- Validation helpers ---

  it('normalizeFavoriteName trims whitespace', () => {
    expect(normalizeFavoriteName('  Shell  ')).toBe('Shell');
  });

  it('normalizeFavoriteGroupName trims whitespace', () => {
    expect(normalizeFavoriteGroupName('  Work Stops  ')).toBe('Work Stops');
  });

  it('isValidFavoriteName rejects empty string', () => {
    expect(isValidFavoriteName('   ')).toBe(false);
  });

  it('isValidFavoriteName accepts valid name', () => {
    expect(isValidFavoriteName('Shell Station')).toBe(true);
  });

  it('isValidFavoriteName rejects name over 40 chars', () => {
    expect(isValidFavoriteName('A'.repeat(41))).toBe(false);
  });

  it('isValidFavoriteGroupName rejects empty string', () => {
    expect(isValidFavoriteGroupName('')).toBe(false);
  });

  it('getFavoriteGroupNameError returns error for empty name', () => {
    expect(getFavoriteGroupNameError('', [])).toBe('Please enter a list name.');
  });

  it('getFavoriteGroupNameError returns error for duplicate name', () => {
    const groups = [{ id: 'g1', name: 'Work', stationIds: [], createdAt: 1 }];
    expect(getFavoriteGroupNameError('work', groups)).toBe('A list with that name already exists.');
  });

  it('getFavoriteGroupNameError allows same name when excluding own id', () => {
    const groups = [{ id: 'g1', name: 'Work', stationIds: [], createdAt: 1 }];
    expect(getFavoriteGroupNameError('Work', groups, 'g1')).toBe('');
  });

  // --- loadFavorites ---

  it('loadFavorites calls GET /favorites with credentials', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse([]));
    await loadFavorites();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5000/favorites',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('loadFavorites returns empty array on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));
    const result = await loadFavorites();
    expect(result).toEqual([]);
  });

  // --- addFavorite ---

  it('addFavorite sends POST then reloads favorites', async () => {
    const station = { id: 's1', name: 'Shell', address: '123 Main St' };
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ message: 'Favorite added' }, 201))
      .mockResolvedValueOnce(mockJsonResponse([{ ...station, createdAt: 1000 }]));

    const result = await addFavorite(station);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:5000/favorites');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(station);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Shell');
  });

  // --- removeFavorite ---

  it('removeFavorite sends DELETE then reloads favorites', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ message: 'Favorite removed' }))
      .mockResolvedValueOnce(mockJsonResponse([]));

    const result = await removeFavorite('s1');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:5000/favorites/s1');
    expect(opts.method).toBe('DELETE');
    expect(result).toEqual([]);
  });

  // --- updateFavoriteName ---

  it('updateFavoriteName sends PUT with new name', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ message: 'Name updated' }))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 's1', name: 'New Name', createdAt: 1 }]));

    const result = await updateFavoriteName('s1', 'New Name');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:5000/favorites/s1/name');
    expect(opts.method).toBe('PUT');
    expect(result[0].name).toBe('New Name');
  });

  // --- createFavoriteGroup ---

  it('createFavoriteGroup sends POST then reloads groups', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ message: 'Group created', id: 'g1' }, 201))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 'g1', name: 'Work', stationIds: [], createdAt: 1 }]));

    const result = await createFavoriteGroup('Work');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:5000/favorite-groups');
    expect(opts.method).toBe('POST');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Work');
  });

  // --- deleteFavoriteGroup ---

  it('deleteFavoriteGroup sends DELETE then reloads groups', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ message: 'Group deleted' }))
      .mockResolvedValueOnce(mockJsonResponse([]));

    const result = await deleteFavoriteGroup('g1');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:5000/favorite-groups/g1');
    expect(opts.method).toBe('DELETE');
    expect(result).toEqual([]);
  });

  // --- addStationToFavoriteGroup ---

  it('addStationToFavoriteGroup sends POST to correct URL', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ message: 'Station added to group' }))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 'g1', name: 'Work', stationIds: ['s1'], createdAt: 1 }]));

    const result = await addStationToFavoriteGroup('g1', 's1');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:5000/favorite-groups/g1/stations/s1');
    expect(opts.method).toBe('POST');
    expect(result[0].stationIds).toContain('s1');
  });

  // --- removeStationFromFavoriteGroup ---

  it('removeStationFromFavoriteGroup sends DELETE to correct URL', async () => {
    mockFetch
      .mockResolvedValueOnce(mockJsonResponse({ message: 'Station removed from group' }))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 'g1', name: 'Work', stationIds: [], createdAt: 1 }]));

    const result = await removeStationFromFavoriteGroup('g1', 's1');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:5000/favorite-groups/g1/stations/s1');
    expect(opts.method).toBe('DELETE');
    expect(result[0].stationIds).not.toContain('s1');
  });
});
