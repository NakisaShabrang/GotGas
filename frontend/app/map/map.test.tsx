import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock mapbox-gl before importing the component
const mockMap = {
  remove: jest.fn(),
  flyTo: jest.fn(),
  fitBounds: jest.fn(),
};

const mockMarker = {
  setLngLat: jest.fn().mockReturnThis(),
  setPopup: jest.fn().mockReturnThis(),
  addTo: jest.fn().mockReturnThis(),
  remove: jest.fn(),
  togglePopup: jest.fn(),
};

const mockPopup = {
  setHTML: jest.fn().mockReturnThis(),
  on: jest.fn(),
  getElement: jest.fn().mockReturnValue(document.createElement('div')),
};

const mockLngLatBounds = {
  extend: jest.fn(),
};

jest.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {
    accessToken: '',
    Map: jest.fn(() => mockMap),
    Marker: jest.fn(() => mockMarker),
    Popup: jest.fn(() => mockPopup),
    LngLatBounds: jest.fn(() => mockLngLatBounds),
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock geolocation
const mockGetCurrentPosition = jest.fn();
Object.defineProperty(navigator, 'geolocation', {
  value: { getCurrentPosition: mockGetCurrentPosition },
  writable: true,
});

// Set the Mapbox token so the useEffect doesn't bail out
process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';

import MapPage from '@/app/map/page';

describe('MapPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  function overpassResponse(elements: any[] = []) {
    const body = JSON.stringify({ elements });
    return {
      ok: true,
      status: 200,
      text: () => Promise.resolve(body),
      json: () => Promise.resolve({ elements }),
    };
  }

  function setupFetchMock(overpassElements: any[] = []) {
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('localhost:5000/favorites')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      if (typeof url === 'string' && url.includes('localhost:5000/favorite-groups')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      return Promise.resolve(overpassResponse(overpassElements));
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    // Reset mocks
    mockFetch.mockReset();
    mockGetCurrentPosition.mockReset();

    // Default: geolocation succeeds with Charlotte, NC
    mockGetCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 35.2271, longitude: -80.8431 } });
    });

    // Default: handle both favorites API and Overpass API
    setupFetchMock();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderMap() {
    await act(async () => {
      root.render(<MapPage />);
    });
    // Let effects and fetches settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  }

  it('renders the page heading', async () => {
    await renderMap();
    const heading = container.querySelector('h2');
    expect(heading?.textContent).toBe('Gas Stations Nearby');
  });

  it('renders the map container div', async () => {
    await renderMap();
    const mapDiv = container.querySelector('#map');
    expect(mapDiv).not.toBeNull();
  });

  it('renders the location search input', async () => {
    await renderMap();
    const input = container.querySelector('input[aria-label="Location search"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toBe('Enter address, city, or zip code');
  });

  it('renders the radius input with default value of 5', async () => {
    await renderMap();
    const input = container.querySelector('input[aria-label="Search radius in miles"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('5');
  });

  it('renders the search button', async () => {
    await renderMap();
    const buttons = Array.from(container.querySelectorAll('button'));
    const searchBtn = buttons.find((b) => b.textContent?.includes('Search'));
    expect(searchBtn).toBeDefined();
  });

  it('shows the saved favorites section', async () => {
    await renderMap();
    expect(container.textContent).toContain('Saved Favorites');
  });

  it('shows "No favorites saved yet." when no favorites exist', async () => {
    await renderMap();
    expect(container.textContent).toContain('No favorites saved yet.');
  });

  it('shows "No stations found." when API returns empty results', async () => {
    await renderMap();
    expect(container.textContent).toContain('No stations found.');
  });

  it('displays station list when API returns stations', async () => {
    const stationElement = {
      type: 'node',
      id: 12345,
      lat: 35.23,
      lon: -80.84,
      tags: { name: 'Test Shell', amenity: 'fuel' },
    };

    setupFetchMock([stationElement]);

    await renderMap();

    expect(container.textContent).toContain('Test Shell');
  });

  it('displays fuel prices for stations', async () => {
    const stationElement = {
      type: 'node',
      id: 12345,
      lat: 35.23,
      lon: -80.84,
      tags: { name: 'Price Station', amenity: 'fuel' },
    };

    setupFetchMock([stationElement]);

    await renderMap();

    // Prices follow the pattern "Regular $X.XX"
    expect(container.textContent).toMatch(/Regular \$\d+\.\d{2}/);
    expect(container.textContent).toMatch(/Mid \$\d+\.\d{2}/);
    expect(container.textContent).toMatch(/Premium \$\d+\.\d{2}/);
    expect(container.textContent).toMatch(/Diesel \$\d+\.\d{2}/);
  });

  it('marks the cheapest station', async () => {
    const stations = [
      { type: 'node', id: 1, lat: 35.23, lon: -80.84, tags: { name: 'Station A', amenity: 'fuel' } },
      { type: 'node', id: 2, lat: 35.24, lon: -80.85, tags: { name: 'Station B', amenity: 'fuel' } },
    ];

    setupFetchMock(stations);

    await renderMap();

    expect(container.textContent).toContain('(Cheapest)');
  });

  it('shows station count after loading', async () => {
    const stations = [
      { type: 'node', id: 1, lat: 35.23, lon: -80.84, tags: { name: 'Station A', amenity: 'fuel' } },
      { type: 'node', id: 2, lat: 35.24, lon: -80.85, tags: { name: 'Station B', amenity: 'fuel' } },
    ];

    setupFetchMock(stations);

    await renderMap();

    expect(container.textContent).toContain('Showing 2 gas stations within 5 miles');
  });

  it('falls back to default location when geolocation fails', async () => {
    mockGetCurrentPosition.mockImplementation((_success: any, error: any) => {
      error(new Error('User denied geolocation'));
    });

    await renderMap();

    // Should still render the page (using default Charlotte, NC coords)
    expect(container.querySelector('h2')?.textContent).toBe('Gas Stations Nearby');
    // Overpass API should still be called
    expect(mockFetch).toHaveBeenCalled();
  });

  it('allows changing the search radius value', async () => {
    await renderMap();

    const radiusInput = container.querySelector('input[aria-label="Search radius in miles"]') as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(radiusInput, '10');
      radiusInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(radiusInput.value).toBe('10');
  });

  it('clamps radius to minimum of 1', async () => {
    await renderMap();

    const radiusInput = container.querySelector('input[aria-label="Search radius in miles"]') as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(radiusInput, '0');
      radiusInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(radiusInput.value).toBe('1');
  });

  it('clamps radius to maximum of 200', async () => {
    await renderMap();

    const radiusInput = container.querySelector('input[aria-label="Search radius in miles"]') as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(radiusInput, '999');
      radiusInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(radiusInput.value).toBe('200');
  });

  it('allows typing in the location search input', async () => {
    await renderMap();

    const searchInput = container.querySelector('input[aria-label="Location search"]') as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(searchInput, 'New York, NY');
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(searchInput.value).toBe('New York, NY');
  });

  it('shows favorites count in sidebar when favorites exist', async () => {
    const favorites = [
      { id: 'fav-1', name: 'My Shell', address: '100 Main St', createdAt: Date.now() },
    ];
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('localhost:5000/favorites')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(favorites) });
      }
      if (typeof url === 'string' && url.includes('localhost:5000/favorite-groups')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      return Promise.resolve(overpassResponse([]));
    });

    await renderMap();

    expect(container.textContent).toContain('Saved Favorites (1)');
    expect(container.textContent).toContain('My Shell');
  });

  it('shows favorite names in the sidebar', async () => {
    const favorites = [
      { id: 'fav-1', name: 'Station Alpha', address: '1 Alpha St', createdAt: Date.now() },
      { id: 'fav-2', name: 'Station Beta', address: '2 Beta St', createdAt: Date.now() },
    ];
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('localhost:5000/favorites')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(favorites) });
      }
      if (typeof url === 'string' && url.includes('localhost:5000/favorite-groups')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      return Promise.resolve(overpassResponse([]));
    });

    await renderMap();

    expect(container.textContent).toContain('Station Alpha');
    expect(container.textContent).toContain('Station Beta');
  });
});
