'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_SEARCH_RADIUS_MILES = 40;

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

function buildPlaceLabel(tags: Record<string, string> | undefined) {
  if (!tags) return 'OpenStreetMap';

  const addressParts = [
    tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : tags['addr:street'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:state'],
    tags['addr:postcode'],
  ].filter(Boolean);

  return addressParts.length > 0 ? addressParts.join(', ') : 'OpenStreetMap';
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

function buildStationPopupHtml(station: any, centerLat: number, centerLng: number) {
  const tags = station?.properties?.tags as Record<string, string> | undefined;
  const name = station?.text || tags?.name || tags?.brand || 'Gas Station';
  const brand = tags?.brand;
  const operator = tags?.operator;
  const address = station?.place_name;
  const openingHours = tags?.opening_hours;
  const phone = tags?.phone || tags?.['contact:phone'];
  const website = tags?.website || tags?.['contact:website'];
  const fuelTypes = getAvailableFuelTypes(tags);
  const coordinates = station?.geometry?.coordinates;

  let distanceLabel = '';
  if (coordinates && coordinates.length >= 2) {
    const stationDistance = distanceMiles(centerLat, centerLng, coordinates[1], coordinates[0]);
    distanceLabel = `${stationDistance.toFixed(1)} mi away`;
  }

  const details = [
    brand ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Brand:</strong> <span style="color:#111;">${escapeHtml(brand)}</span></div>` : '',
    operator ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Operator:</strong> <span style="color:#111;">${escapeHtml(operator)}</span></div>` : '',
    openingHours ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Hours:</strong> <span style="color:#111;">${escapeHtml(openingHours)}</span></div>` : '',
    phone ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Phone:</strong> <span style="color:#111;">${escapeHtml(phone)}</span></div>` : '',
    website ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Website:</strong> <span style="color:#111;">${escapeHtml(website)}</span></div>` : '',
    fuelTypes.length > 0 ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Fuel:</strong> <span style="color:#111;">${escapeHtml(fuelTypes.join(', '))}</span></div>` : '',
    distanceLabel ? `<div style="margin-bottom:4px;"><strong style="color:#111;">Distance:</strong> <span style="color:#111;">${escapeHtml(distanceLabel)}</span></div>` : '',
  ]
    .filter(Boolean)
    .join('');

  return `<div style="min-width:220px;line-height:1.45;background:#ffffff;color:#111111;padding:2px;">
    <div style="font-weight:700;font-size:15px;margin-bottom:6px;color:#000;">${escapeHtml(name)}</div>
    ${address ? `<div style="margin-bottom:8px;color:#111;font-size:13px;">${escapeHtml(address)}</div>` : ''}
    ${details || '<div style="color:#111;">No additional details available.</div>'}
  </div>`;
}

export default function MapPage() {
  const [stations, setStations] = useState<any[]>([]);
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
  const refreshStationsRef = useRef<(lat: number, lng: number) => Promise<void>>(async () => {});
  const searchLocationRef = useRef<(query: string) => Promise<void>>(async () => {});

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
      try {
        const selectedRadiusMiles = radiusMilesRef.current;
        const radiusMeters = milesToMeters(selectedRadiusMiles);
        const overpassQuery = `[out:json][timeout:25];
(
  node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
  way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
);
out center;`;

        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
        });

        const contentType = res.headers.get('content-type') || '';
        const rawBody = await res.text();

        if (!res.ok) {
          throw new Error(`OpenStreetMap request failed with status ${res.status}.`);
        }

        const looksLikeJson = contentType.includes('application/json') || rawBody.trim().startsWith('{');
        if (!looksLikeJson) {
          throw new Error('OpenStreetMap returned a non-JSON response.');
        }

        let data: any;
        try {
          data = JSON.parse(rawBody);
        } catch {
          throw new Error('OpenStreetMap returned invalid JSON.');
        }

        const elements = data?.elements || [];

        const features = elements
          .map((element: any) => {
            const latitude = element.lat ?? element.center?.lat;
            const longitude = element.lon ?? element.center?.lon;
            if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;

            return {
              id: `osm-${element.type}-${element.id}`,
              text: element.tags?.name || element.tags?.brand || 'Gas Station',
              place_name: buildPlaceLabel(element.tags),
              properties: {
                tags: element.tags || {},
              },
              geometry: {
                coordinates: [longitude, latitude],
              },
            };
          })
          .filter(Boolean);

        const inRadiusFeatures = features.filter((feature: any) => {
          const coordinates = feature?.geometry?.coordinates;
          if (!coordinates || coordinates.length < 2) return false;
          const [featureLng, featureLat] = coordinates;
          return distanceMiles(lat, lng, featureLat, featureLng) <= selectedRadiusMiles;
        });

        stationMarkersRef.current.forEach((m) => m.remove());
        stationMarkersRef.current = [];

        setStations(inRadiusFeatures);

        inRadiusFeatures.forEach((f: any) => {
          if (!f.geometry || !f.geometry.coordinates) return;
          const [lng2, lat2] = f.geometry.coordinates;
          const marker = new mapboxRef.current.Marker({ color: '#e53935' })
            .setLngLat([lng2, lat2])
            .setPopup(new mapboxRef.current.Popup({ offset: 8 }).setHTML(buildStationPopupHtml(f, lat, lng)))
            .addTo(mapInstanceRef.current);
          stationMarkersRef.current.push(marker);
        });

        if (inRadiusFeatures.length > 0 && mapInstanceRef.current) {
          const bounds = new mapboxRef.current.LngLatBounds([lng, lat], [lng, lat]);
          inRadiusFeatures.forEach((feature: any) => {
            const coordinates = feature?.geometry?.coordinates;
            if (!coordinates || coordinates.length < 2) return;
            bounds.extend([coordinates[0], coordinates[1]]);
          });
          mapInstanceRef.current.fitBounds(bounds, { padding: 50, maxZoom: 13 });
        }
      } catch (err) {
        console.error('OpenStreetMap places fetch failed', err);
        setSearchError('OpenStreetMap is temporarily unavailable. Please try again in a moment.');
      }
      setLoading(false);
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
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          trimmed
        )}.json?limit=1&autocomplete=true&types=address,postcode,place,locality,neighborhood&access_token=${token}`;
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

  const onStationClick = (station: any, index: number) => {
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
          disabled={searchingLocation}
          style={{
            padding: '0.55rem 0.85rem',
            border: '1px solid #ccc',
            borderRadius: 8,
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
        >
          {searchingLocation ? 'Searching...' : 'Search'}
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
          {loading && <p style={{ marginTop: 0 }}>Loading gas stations from OpenStreetMap within {radiusMiles} miles...</p>}
          {!loading && stations.length > 0 && <p style={{ marginTop: 0 }}>Showing {stations.length} gas stations within {radiusMiles} miles.</p>}
          {!loading && stations.length === 0 && <p style={{ marginTop: 0 }}>No stations found.</p>}
          <ul style={{ paddingLeft: '1rem', marginBottom: 0 }}>
            {stations.map((s, i) => (
              <li key={s.id || s.properties?.id || i} style={{ marginBottom: '0.75rem' }}>
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
                  <strong>{s.text}</strong>
                  {s.place_name && <div style={{ opacity: 0.85 }}>{s.place_name}</div>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
