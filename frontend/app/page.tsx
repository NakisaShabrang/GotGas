'use client';

import Link from 'next/link'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddToFavoritesButton from "./components/AddToFavoritesButton";

export default function Home() {
  const [location, setLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleTryFeature = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to map with search parameters
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (searchTerm) params.append('search', searchTerm);
    router.push(`/map?${params.toString()}`);
  };

  return (
    <div style={{ padding: '40px 20px' }}>
      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        marginBottom: '60px',
        paddingBottom: '40px',
        borderBottom: '1px solid rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>Welcome to GotGas</h1>
        <p style={{ fontSize: '20px', color: '#666', marginBottom: '24px' }}>
          Find the cheapest gas stations near you in seconds
        </p>
        <p style={{ fontSize: '16px', color: '#888', maxWidth: '600px', margin: '0 auto' }}>
          GotGas helps you save money on gas by showing you the most affordable gas stations in your area. 
          Stop wasting time and money—start finding better prices today.
        </p>
      </section>

      {/* Features Section */}
      <section style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '32px', textAlign: 'center' }}>How It Works</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px'
        }}>
          {/* Feature 1 */}
          <div style={{
            padding: '24px',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>📍 Search by Location</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Enter your location or let us use your current position to find gas stations nearby instantly.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{
            padding: '24px',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>💰 Compare Prices</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              See real-time gas prices from hundreds of stations and identify the best deals in your area.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{
            padding: '24px',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>⭐ Save Favorites</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Bookmark your favorite gas stations and keep track of their prices to save the most money.
            </p>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section style={{
        backgroundColor: '#f0f0f0',
        padding: '48px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '32px', marginBottom: '24px' }}>Try It Now</h2>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
          Enter your location and start finding the cheapest gas stations near you
        </p>

        <form onSubmit={handleTryFeature} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <input
            type="text"
            placeholder="Enter your location (e.g., New York, NY)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontFamily: 'inherit'
            }}
          />

          <input
            type="text"
            placeholder="Optional: Gas type or station name (e.g., Shell, Premium)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px 16px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontFamily: 'inherit'
            }}
          />

          <button
            type="submit"
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#555'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#333'}
          >
            Find Cheap Gas →
          </button>
        </form>

        <p style={{ fontSize: '14px', color: '#888', marginTop: '20px' }}>
          Or go to <Link href="/map" style={{ color: '#333', textDecoration: 'underline' }}>Map</Link> to start exploring
        </p>
      </section>
    </div>
  )
}
