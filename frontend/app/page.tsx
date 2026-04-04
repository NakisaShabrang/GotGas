'use client';

import Link from 'next/link'
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [location, setLocation] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) {
      router.push(`/map?location=${encodeURIComponent(location.trim())}`);
    } else {
      router.push('/map');
    }
  };

  const faqs = [
    { q: 'How are gas prices determined?', a: 'Gas prices are influenced by crude oil costs, refining expenses, distribution, marketing, and federal/state taxes. Crude oil alone accounts for about 50% of the price at the pump.' },
    { q: 'How accurate are the price predictions?', a: 'Predictions use linear regression on historical weekly data. The confidence indicator shows how consistent the trend has been — higher confidence means the data fits a steady pattern.' },
    { q: 'Can I save my favorite gas stations?', a: 'Yes. Click the Save button on any station in the map view, and it will appear on your Favorites page for quick access.' },
    { q: 'What areas does GotGas cover?', a: 'GotGas uses OpenStreetMap data, so it covers gas stations across the entire United States. You can search by address, city, or zip code.' },
    { q: 'Why is data unavailable for some states in predictions?', a: 'The prediction feature currently uses mock historical data for a subset of states. States without data will show a message indicating the data is not yet available.' },
  ];

  return (
    <div style={{ padding: '40px 20px', maxWidth: 900, margin: '0 auto' }}>
      {/* Title */}
      <h1 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '40px' }}>
        Welcome to GotGas
      </h1>

      {/* Search */}
      <form onSubmit={handleSearch} style={{
        display: 'flex',
        gap: '10px',
        maxWidth: 600,
        margin: '0 auto 48px',
      }}>
        <input
          type="text"
          placeholder="Enter address, city, or zip code (e.g., 27262)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '16px',
            border: '1px solid rgba(128,128,128,0.3)',
            borderRadius: '8px',
            fontFamily: 'inherit',
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
        <button type="submit" className="home-cta-btn" style={{ minWidth: 100 }}>
          Search
        </button>
      </form>

      {/* How the site works */}
      <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>How the site works</h2>

      <div style={{
        border: '1px solid rgba(128,128,128,0.3)',
        borderRadius: '10px',
        padding: '28px 32px',
        marginBottom: '48px',
        lineHeight: 1.8,
        fontSize: '0.95rem',
        opacity: 0.85,
      }}>
        <p style={{ marginTop: 0, marginBottom: '16px' }}>
          GotGas helps you find the cheapest gas stations near any location. Use the search bar above or visit the{' '}
          <Link href="/map" style={{ color: '#16a34a', textDecoration: 'underline' }}>Map</Link> page to browse stations
          sorted by price. You can adjust the search radius and view details like fuel prices, address, and hours for each station.
        </p>
        <p style={{ marginTop: 0, marginBottom: '16px' }}>
          Save stations you visit often by clicking the <strong>Save</strong> button, then view them anytime on the{' '}
          <Link href="/favorites" style={{ color: '#16a34a', textDecoration: 'underline' }}>Favorites</Link> page.
          Create a <Link href="/login" style={{ color: '#16a34a', textDecoration: 'underline' }}>profile</Link> to
          keep your preferences and favorites saved across sessions.
        </p>
        <p style={{ margin: 0 }}>
          The <Link href="/predictions" style={{ color: '#16a34a', textDecoration: 'underline' }}>Predictions</Link> page
          shows historical gas price trends for each state over the past 8 weeks, along with a predicted price for next week.
          A confidence indicator tells you how reliable the prediction is based on how consistent the trend has been.
        </p>
      </div>

      {/* Links to news */}
      <div style={{
        border: '1px solid rgba(128,128,128,0.3)',
        borderRadius: '10px',
        padding: '28px 32px',
        marginBottom: '48px',
        textAlign: 'center',
      }}>
        <p style={{ marginTop: 0, marginBottom: '20px', opacity: 0.7, fontSize: '0.95rem' }}>
          Links to news about gas prices and possible reasons as to why prices are the way they are.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://www.eia.gov/energyexplained/gasoline/factors-affecting-gasoline-prices.php"
            target="_blank"
            rel="noopener noreferrer"
            className="home-cta-btn"
            style={{ textDecoration: 'none', fontSize: '14px', padding: '10px 20px' }}
          >
            How Gas Prices Work
          </a>
          <a
            href="https://www.eia.gov/petroleum/gasdiesel/"
            target="_blank"
            rel="noopener noreferrer"
            className="home-cta-btn"
            style={{ textDecoration: 'none', fontSize: '14px', padding: '10px 20px' }}
          >
            Weekly Price Reports
          </a>
          <a
            href="https://gasprices.aaa.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="home-cta-btn"
            style={{ textDecoration: 'none', fontSize: '14px', padding: '10px 20px' }}
          >
            AAA Gas Prices
          </a>
        </div>
      </div>

      {/* FAQs */}
      <div style={{
        border: '1px solid rgba(128,128,128,0.3)',
        borderRadius: '10px',
        padding: '28px 32px',
        maxWidth: 700,
        margin: '0 auto',
      }}>
        <h3 style={{ textAlign: 'center', marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>
          FAQs and other questions
        </h3>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid rgba(128,128,128,0.2)' : 'none' }}>
            <button
              type="button"
              onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              style={{
                all: 'unset',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '14px 0',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              {faq.q}
              <span style={{ marginLeft: '12px', opacity: 0.5 }}>{faqOpen === i ? '−' : '+'}</span>
            </button>
            {faqOpen === i && (
              <p style={{ margin: '0 0 14px', opacity: 0.75, lineHeight: 1.6, fontSize: '0.9rem' }}>
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
