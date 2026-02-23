'use client';

import { useEffect, useRef, useState } from 'react';
import { addFavorite, FavoriteStation, loadFavorites, removeFavorite } from '@/app/lib/favorites';

const DEFAULT_SEARCH_RADIUS_MILES = 5;

type FuelPrices = {
  regular: number;
  midGrade: number;
  premium: number;
  diesel: number;
};

type StationFeature = {
  id: string;
  text: string;
  place_name: string;
  geocoded_address?: string;
  isCheapest?: boolean;
  properties: { tags: Record<string, string> };
  geometry: { coordinates: [number, number] };
  fuelPrices: FuelPrices;
};

function milesToKilometers(miles: number) {
  return miles * 1.609344;
}

function getBoundingBox(latitude: number, longitude: number, radiusMiles: number) {
  const radiusKm = milesToKilometers(radiusMiles);
  const latitudeDelta = radiusKm / 110.574;
  const longitudeDelta = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180));

  return {
    minLng: longitude - longitudeDelta,
    minLat: latitude - latitudeDelta,
    maxLng: longitude + longitudeDelta,
    maxLat: latitude + latitudeDelta,
  };
}

function distanceMiles(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function milesToMeters(miles: number) {
  return Math.round(miles * 1609.344);
}

const MIN_FUEL_PRICE = 2;
const MAX_FUEL_PRICE = 3.5;

function randomPriceInRange(min: number, max: number) {
  if (max <= min) {
    return Number(min.toFixed(2));
  }

  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function generateFuelPrices(): FuelPrices {
  const regular = randomPriceInRange(MIN_FUEL_PRICE, 3.05);

  const midFloor = Math.min(MAX_FUEL_PRICE, regular + 0.12);
  const midCeiling = Math.min(MAX_FUEL_PRICE, regular + 0.42);
  const midGrade = randomPriceInRange(midFloor, midCeiling);

  const premiumFloor = Math.min(MAX_FUEL_PRICE, midGrade + 0.12);
  const premiumCeiling = Math.min(MAX_FUEL_PRICE, midGrade + 0.45);
  const premium = randomPriceInRange(premiumFloor, premiumCeiling);

  const dieselFloor = Math.min(MAX_FUEL_PRICE, regular + 0.05);
  const dieselCeiling = Math.min(MAX_FUEL_PRICE, Math.max(midGrade + 0.1, regular + 0.65));
  const diesel = randomPriceInRange(dieselFloor, dieselCeiling);

  return {
    regular,
    midGrade,
    premium,
    diesel,
  };
}

function buildPlaceLabel(tags: Record<string, string> | undefined) {
  if (!tags) return '';

  const addressParts = [
    tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : tags['addr:street'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:state'],
    tags['addr:postcode'],
  ].filter(Boolean);

  if (addressParts.length > 0) {
    return addressParts.join(', ');
  }

  // Fallback: try to construct address from available tags
  const fallbackParts = [tags['name'], tags['street'], tags['city'], tags['postcode']].filter(Boolean);

  return fallbackParts.length > 0 ? fallbackParts.join(', ') : '';
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getAvailableFuelTypes(tags: Record<string, string> | undefined) {
  if (!tags) return [];

  return Object.entries(tags)
    .filter(([key, val]) => key.startsWith('fuel:') && ['yes', '1', 'true'].includes(val.toLowerCase()))
    .map(([key]) => titleCase(key.replace('fuel:', '')));
}

function buildStationPopupHtml(station: StationFeature, centerLat: number, centerLng: number, isFavorite: boolean) {
  const tags = station?.properties?.tags as Record<string, string> | undefined;
  const name = station?.text || tags?.name || tags?.brand || 'Gas Station';
  const operator = tags?.operator;
  const address = station?.place_name;
  const openingHours = tags?.opening_hours;
  const phone = tags?.phone || tags?.['contact:phone'];
  const website = tags?.website || tags?.['contact:website'];
  const fuelTypes = getAvailableFuelTypes(tags);
  const fuelPrices = station?.fuelPrices;
  const coordinates = station?.geometry?.coordinates;
  const geocodedAddress = station?.geocoded_address; // New fallback for reverse geocoded address

  let distanceLabel = '';
  if (coordinates && coordinates.length >= 2) {
    const stationDistance = distanceMiles(centerLat, centerLng, coordinates[1], coordinates[0]);
    distanceLabel = `${stationDistance.toFixed(1)} mi away`;
  }

  const details = [
    `<div style="margin-bottom:8px;">
      <button
        type="button"
        data-favorite-id="${escapeHtml(station.id)}"
        style="border:1px solid #d1d5db;border-radius:8px;padding:4px 8px;background:${isFavorite ? '#14532d' : '#ffffff'};color:${isFavorite ? '#ffffff' : '#111111'};cursor:pointer;font-weight:600;"
      >
        ${isFavorite ? '★ Saved' : '☆ Save'}
      </button>
    </div>`,
    station.isCheapest
      ? '<div style="margin-bottom:6px;"><strong style="color:#0f766e;">Cheapest in this list</strong></div>'
      : '',
    operator ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Operator:</strong> <span style="color:#111;">${escapeHtml(operator)}</span></div>` : '',
    openingHours ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Hours:</strong> <span style="color:#111;">${escapeHtml(openingHours)}</span></div>` : '',
    phone ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Phone:</strong> <span style="color:#111;">${escapeHtml(phone)}</span></div>` : '',
    website ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Website:</strong> <span style="color:#111;">${escapeHtml(website)}</span></div>` : '',
    fuelTypes.length > 0 ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Fuel:</strong> <span style="color:#111;">${escapeHtml(fuelTypes.join(', '))}</span></div>` : '',
    fuelPrices
      ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Prices:</strong> <span style="color:#111;">Regular $${fuelPrices.regular.toFixed(2)} · Mid $${fuelPrices.midGrade.toFixed(2)} · Premium $${fuelPrices.premium.toFixed(2)} · Diesel $${fuelPrices.diesel.toFixed(2)}</span></div>`
      : '',
    distanceLabel ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Distance:</strong> <span style="color:#111;">${escapeHtml(distanceLabel)}</span></div>` : '',
  ]
    .filter(Boolean)
    .join('');
  const displayAddress = address || geocodedAddress;
  return `<div style="min-width:220px;line-height:1.45;background:#ffffff;color:#111111;padding:2px;">
    <div style="font-weight:700;font-size:15px;margin-bottom:6px;color:#000;">${escapeHtml(name)}</div>
    ${displayAddress ? `<div style="margin-bottom:8px;color:#111;font-size:13px;">${escapeHtml(displayAddress)}</div>` : ''}
    ${details || '<div style="color:#111;">No additional details available.</div>'}
  </div>`;
}

export default function MapPage() {
  const [stations, setStations] = useState<StationFeature[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [savedFavorites, setSavedFavorites] = useState<FavoriteStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_SEARCH_RADIUS_MILES);
  const [searchError, setSearchError] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const stationMarkersRef = useRef<any[]>([]);
  const selectedLocationMarkerRef = useRef<any>(null);
  const radiusMilesRef = useRef(DEFAULT_SEARCH_RADIUS_MILES);
  const currentCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const favoriteIdsRef = useRef<Set<string>>(new Set());
  const refreshStationsRef = useRef<(lat: number, lng: number) => Promise<void>>(async () => {});
  const searchLocationRef = useRef<(query: string) => Promise<void>>(async () => {});

  useEffect(() => {
    const favorites = loadFavorites();
    const ids = new Set(favorites.map((favorite) => favorite.id));
    setFavoriteIds(ids);
    setSavedFavorites(favorites);
  }, []);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);

  useEffect(() => {
    radiusMilesRef.current = radiusMiles;
  }, [radiusMiles]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!token) return;

    // inject Mapbox CSS (CDN)
    const cssId = 'mapbox-gl-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      document.head.appendChild(link);
    }

    const fetchPlaces = async (lat: number, lng: number) => {
      setLoading(true);
      setSearchError('');
      try {
        const selectedRadiusMiles = radiusMilesRef.current;
        const radiusMeters = milesToMeters(selectedRadiusMiles);

        const overpassQuery = `[out:json][timeout:30][maxsize:536870912];(node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});relation["amenity"="fuel"](around:${radiusMeters},${lat},${lng}););out center;`;

        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
        });

        const rawBody = await res.text();
        if (!res.ok) throw new Error(`OpenStreetMap request failed with status ${res.status}.`);

        let data: any;
        try {
          data = JSON.parse(rawBody);
        } catch (err) {
          throw new Error('OpenStreetMap returned invalid JSON.');
        }

        const elements = data?.elements || [];

        const features = elements
          .map((element: any) => {
            let lat = typeof element.lat === 'number' ? element.lat : element.center?.lat;
            let lon = typeof element.lon === 'number' ? element.lon : element.center?.lon;

            // For ways and relations, calculate a simple center from geometry if available
            if ((element.type === 'way' || element.type === 'relation') && element.geometry && (!lat || !lon)) {
              const lats = element.geometry.map((n: any) => n.lat).filter((v: any) => typeof v === 'number');
              const lons = element.geometry.map((n: any) => n.lon).filter((v: any) => typeof v === 'number');
              if (lats.length > 0 && lons.length > 0) {
                lat = (Math.min(...lats) + Math.max(...lats)) / 2;
                lon = (Math.min(...lons) + Math.max(...lons)) / 2;
              }
            }

            if (typeof lat !== 'number' || typeof lon !== 'number') return null;

            return {
              id: `osm-${element.type}-${element.id}`,
              text: element.tags?.name || element.tags?.brand || 'Gas Station',
              place_name: buildPlaceLabel(element.tags),
              properties: { tags: element.tags || {} },
              geometry: { coordinates: [lon, lat] },
            };
          })
          .filter(Boolean) as Array<Omit<StationFeature, 'fuelPrices'>>;

        const inRadiusFeatures = features.filter((feature) => {
          const coords = feature?.geometry?.coordinates;
          if (!coords || coords.length < 2) return false;
          const [fLng, fLat] = coords;
          return distanceMiles(lat, lng, fLat, fLng) <= selectedRadiusMiles;
        });

        // Reverse geocode missing addresses (but be conservative about requests)
        const enrichedFeatures = await Promise.all(
          inRadiusFeatures.map(async (feature, index) => {
            const placeName = feature?.place_name;
            const isRealAddress = placeName && placeName.includes(',');
            if (isRealAddress) return feature;

            const coords = feature?.geometry?.coordinates;
            if (!coords || coords.length < 2) return feature;

            try {
              const [lng2, lat2] = coords;
              await new Promise((r) => setTimeout(r, index * 50));
              const reverseGeocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng2},${lat2}.json?limit=1&access_token=${token}`;
              const r = await fetch(reverseGeocodeUrl);
              if (!r.ok) return feature;
              const json = await r.json();
              const result = json?.features?.[0];
              if (result?.place_name) return { ...feature, geocoded_address: result.place_name };
            } catch (err) {
              // ignore per-feature errors
            }

            return feature;
          })
        );

        const stationsWithPrices: StationFeature[] = enrichedFeatures
          .map((feature) => ({ ...feature, fuelPrices: generateFuelPrices() }))
          .sort((a, b) => a.fuelPrices.regular - b.fuelPrices.regular)
          .map((station, index) => ({ ...station, isCheapest: index === 0 }));

        // remove old markers
        stationMarkersRef.current.forEach((m) => m.remove());
        stationMarkersRef.current = [];

        setStations(stationsWithPrices);

        // create markers and bounds
        if (mapInstanceRef.current && mapboxRef.current) {
          let bounds: any = null;
          stationsWithPrices.forEach((f) => {
            const coords = f?.geometry?.coordinates;
            if (!coords || coords.length < 2) return;
            const [lng2, lat2] = coords;
            const popup = new mapboxRef.current.Popup({ offset: 8 }).setHTML(
              buildStationPopupHtml(f, lat, lng, favoriteIdsRef.current.has(f.id))
            );

            popup.on('open', () => {
              const popupElement = popup.getElement();
              const button = popupElement?.querySelector(`[data-favorite-id="${f.id}"]`) as HTMLButtonElement | null;
              if (!button) return;

              button.onclick = () => {
                const currentlyFavorite = favoriteIdsRef.current.has(f.id);

                if (currentlyFavorite) {
                  const updated = removeFavorite(f.id);
                  const nextIds = new Set(updated.map((favorite) => favorite.id));
                  setFavoriteIds(nextIds);
                  setSavedFavorites(updated);
                  button.textContent = '☆ Save';
                  button.style.background = '#ffffff';
                  button.style.color = '#111111';
                } else {
                  const updated = addFavorite({
                    id: f.id,
                    name: f.text,
                    address: f.place_name || f.geocoded_address,
                  });
                  const nextIds = new Set(updated.map((favorite) => favorite.id));
                  setFavoriteIds(nextIds);
                  setSavedFavorites(updated);
                  button.textContent = '★ Saved';
                  button.style.background = '#14532d';
                  button.style.color = '#ffffff';
                }
              };
            });

            const marker = new mapboxRef.current.Marker({
              color: f.isCheapest ? '#16a34a' : '#e53935',
              scale: f.isCheapest ? 1.45 : 1,
            })
              .setLngLat([lng2, lat2])
              .setPopup(popup)
              .addTo(mapInstanceRef.current);
            stationMarkersRef.current.push(marker);

            if (!bounds) bounds = new mapboxRef.current.LngLatBounds([lng2, lat2], [lng2, lat2]);
            bounds.extend([lng2, lat2]);
          });

          if (bounds) {
            mapInstanceRef.current.fitBounds(bounds, { padding: 50, maxZoom: 13 });
          }
        }
      } catch (err) {
        console.error('OpenStreetMap places fetch failed', err);
        setSearchError('OpenStreetMap is temporarily unavailable. Please try again in a moment.');
      } finally {
        setLoading(false);
      }
    };

    refreshStationsRef.current = fetchPlaces;

    searchLocationRef.current = async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchError('Enter an address, city, or zip code.');
        return;
      }

      if (!mapboxRef.current || !mapInstanceRef.current) {
        setSearchError('Map is still loading. Try again.');
        return;
      }

      setSearchingLocation(true);
      setSearchError('');

      try {
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?limit=1&autocomplete=true&types=address,postcode,place,locality,neighborhood&access_token=${token}`;
        const res = await fetch(geocodeUrl);
        const data = await res.json();
        const feature = data?.features?.[0];

        if (!feature?.center || feature.center.length < 2) {
          setSearchError('Location not found. Try a more specific query.');
          return;
        }

        const [lng, lat] = feature.center;
        mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 13 });
        setLocationQuery(feature.place_name || trimmed);
        currentCenterRef.current = { lat, lng };

        if (selectedLocationMarkerRef.current) {
          selectedLocationMarkerRef.current.setLngLat([lng, lat]);
        } else {
          selectedLocationMarkerRef.current = new mapboxRef.current.Marker({ color: '#2563eb' })
            .setLngLat([lng, lat])
            .addTo(mapInstanceRef.current);
        }

        await fetchPlaces(lat, lng);
      } catch (err) {
        console.error('Mapbox geocode failed', err);
        setSearchError('Search failed. Please try again.');
      } finally {
        setSearchingLocation(false);
      }
    };

    const init = async (lat: number, lng: number) => {
      mapboxRef.current = (await import('mapbox-gl')).default;
      mapboxRef.current.accessToken = token;
      if (!mapRef.current) return;
      mapInstanceRef.current = new mapboxRef.current.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [lng, lat],
        zoom: 13,
      });

      selectedLocationMarkerRef.current = new mapboxRef.current.Marker({ color: '#2563eb' })
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current);
      currentCenterRef.current = { lat, lng };

      await fetchPlaces(lat, lng);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => init(pos.coords.latitude, pos.coords.longitude),
        () => init(35.311795, -80.741203),
        { timeout: 5000 }
      );
    } else {
      init(35.311795, -80.741203);
    }

    return () => {
      selectedLocationMarkerRef.current?.remove();
      stationMarkersRef.current.forEach((m) => m.remove());
      stationMarkersRef.current = [];
      mapInstanceRef.current?.remove();
    };
  }, []);

  const onSubmitLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (searchingLocation || loading) {
      return;
    }

    if (!locationQuery.trim() && currentCenterRef.current) {
      setSearchError('');
      await refreshStationsRef.current(currentCenterRef.current.lat, currentCenterRef.current.lng);
      return;
    }

    await searchLocationRef.current(locationQuery);
  };

  const onRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextRadius = Number(e.target.value);
    if (!Number.isFinite(nextRadius)) return;
    const clampedRadius = Math.max(1, Math.min(200, nextRadius));
    setRadiusMiles(clampedRadius);
  };

  const onStationClick = (station: StationFeature, index: number) => {
    const coordinates = station?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2 || !mapInstanceRef.current) return;

    const [lng, lat] = coordinates;
    mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 15 });

    const marker = stationMarkersRef.current[index];
    if (marker?.togglePopup) {
      marker.togglePopup();
    }
  };

  return (
    <div style={{ padding: '1.25rem', maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Gas Stations Nearby</h2>

      <form
        onSubmit={onSubmitLocation}
        style={{
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          padding: '0.75rem',
          border: '1px solid #ccc',
          borderRadius: 10,
        }}
      >
        <input
          type="text"
          value={locationQuery}
          onChange={(e) => {
            setLocationQuery(e.target.value);
            if (searchError) setSearchError('');
          }}
          placeholder="Enter address, city, or zip code"
          aria-label="Location search"
          style={{
            flex: 1,
            minWidth: 260,
            padding: '0.55rem 0.65rem',
            border: '1px solid #ccc',
            borderRadius: 8,
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
        <input
          type="number"
          min={1}
          max={200}
          value={radiusMiles}
          onChange={onRadiusChange}
          aria-label="Search radius in miles"
          style={{
            width: 140,
            padding: '0.55rem 0.65rem',
            border: '1px solid #ccc',
            borderRadius: 8,
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
        <button
          type="submit"
          disabled={searchingLocation || loading}
          style={{
            padding: '0.55rem 0.85rem',
            border: '1px solid #ccc',
            borderRadius: 8,
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
        >
          {searchingLocation || loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searchError && <p style={{ color: '#8b1a1a', marginTop: 0, marginBottom: '0.9rem' }}>{searchError}</p>}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 60%', minWidth: 280, minHeight: 0 }}>
          <div
            ref={mapRef}
            style={{
              height: '70vh',
              minHeight: 320,
              border: '1px solid #ccc',
              borderRadius: 10,
              overflow: 'hidden',
            }}
            id="map"
          />
        </div>
        <div
          style={{
            flex: '0 0 320px',
            width: '320px',
            maxHeight: '70vh',
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: 10,
            padding: '0.75rem',
          }}
        >
          <div
            style={{
              marginBottom: '0.85rem',
              border: '1px solid #facc15',
              background: '#fef9c3',
              borderRadius: 10,
              padding: '0.6rem 0.65rem',
            }}
          >
            <p style={{ marginTop: 0, marginBottom: '0.4rem', color: '#854d0e', fontWeight: 700 }}>
              ★ Saved Favorites ({savedFavorites.length})
            </p>
            {savedFavorites.length === 0 && (
              <p style={{ margin: 0, color: '#854d0e', fontSize: '0.85rem' }}>No favorites saved yet.</p>
            )}
            {savedFavorites.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '1rem', color: '#854d0e' }}>
                {savedFavorites.slice(0, 5).map((favorite) => (
                  <li key={favorite.id} style={{ marginBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600 }}>{favorite.name}</div>
                    {favorite.address && <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>{favorite.address}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {loading && <p style={{ marginTop: 0 }}>Loading gas stations from OpenStreetMap within {radiusMiles} miles...</p>}
          {!loading && stations.length > 0 && <p style={{ marginTop: 0 }}>Showing {stations.length} gas stations within {radiusMiles} miles (sorted by cheapest regular).</p>}
          {!loading && stations.length === 0 && <p style={{ marginTop: 0 }}>No stations found.</p>}
          <ul style={{ paddingLeft: '1rem', marginBottom: 0 }}>
            {stations.map((s, i) => {
              // Display address in sidebar - prefer place_name, fallback to geocoded_address
              const displayAddress = s.place_name ? s.place_name : s.geocoded_address;
              return (
                <li
                  key={s.id || i}
                  style={{
                    marginBottom: '0.75rem',
                    border: s.isCheapest ? '1px solid #16a34a' : '1px solid transparent',
                    borderRadius: 8,
                    background: s.isCheapest ? 'rgba(22, 163, 74, 0.08)' : 'transparent',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onStationClick(s, i)}
                    style={{
                      all: 'unset',
                      display: 'block',
                      width: '100%',
                      cursor: 'pointer',
                      borderRadius: 8,
                      padding: '0.35rem 0.4rem',
                    }}
                  >
                    <strong>
                      {s.text}
                      {s.isCheapest ? ' (Cheapest)' : ''}
                    </strong>
                    {displayAddress && <div style={{ opacity: 0.85, fontSize: '0.85rem' }}>{displayAddress}</div>}
                    <div style={{ opacity: 0.9, fontSize: '0.85rem' }}>
                      Regular ${s.fuelPrices.regular.toFixed(2)} · Mid ${s.fuelPrices.midGrade.toFixed(2)} · Premium ${s.fuelPrices.premium.toFixed(2)} · Diesel ${s.fuelPrices.diesel.toFixed(2)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}