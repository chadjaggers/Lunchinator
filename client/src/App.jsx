import { useState, useEffect, useMemo } from 'react';
import { getRestaurants, addRestaurant, getSettings } from './api';
import RestaurantList from './components/RestaurantList';
import RestaurantForm from './components/RestaurantForm';
import SettingsPanel from './components/SettingsPanel';
import LaunchPanel from './components/LaunchPanel';
import Eyebrow from './components/Eyebrow';
import { IPlus, ISlack, IAlert, IClose } from './components/Icons';

export default function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [settings, setSettings] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState(null);

  async function refresh() {
    try {
      const [r, s] = await Promise.all([getRestaurants(), getSettings()]);
      setRestaurants(r);
      setSettings(s);
    } catch {
      setError('Failed to load data. Is the server running?');
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleAdd(data) {
    try {
      await addRestaurant(data);
      setShowAdd(false);
      refresh();
    } catch {
      setError('Failed to add restaurant. Please try again.');
    }
  }

  const today = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }), []);

  return (
    <div className="min-h-screen">
      {/* TOP BAR */}
      <header style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Phase2_WordmarkGradientDarkBG.svg"
              alt="Phase2"
              style={{ height: 22 }}
            />
            <span style={{ width: 1, height: 18, background: 'var(--border)' }} />
            <span
              style={{
                fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 14,
                color: 'var(--text)', letterSpacing: '-0.005em',
              }}
            >
              Lunchinator
            </span>
            <span
              style={{
                fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 10,
                color: 'var(--cyan)', letterSpacing: '0.04em',
                background: 'rgba(22, 163, 214, 0.10)',
                border: '1px solid rgba(22, 163, 214, 0.35)',
                borderRadius: 999, padding: '2px 8px', marginLeft: 4,
              }}
            >
              admin
            </span>
          </div>
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <ISlack size={14} />
            <span>#lunch-club</span>
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#4ade80', boxShadow: '0 0 8px #4ade80',
                marginLeft: 6,
              }}
            />
            <span style={{ color: 'var(--ice)' }}>Connected</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-start justify-between gap-8">
          <div>
            <Eyebrow>Today · {today}</Eyebrow>
            <h1
              style={{
                marginTop: 14,
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 300, fontSize: 52, lineHeight: 1.0,
                letterSpacing: '-0.025em', color: 'var(--text)',
              }}
            >
              Where are we<br />
              <span style={{ fontWeight: 800 }}>eating</span>{' '}
              <span style={{ fontWeight: 800, color: 'var(--ice)' }}>today_</span>
            </h1>
            <p
              style={{
                marginTop: 12, fontSize: 16, color: 'var(--text-muted)',
                maxWidth: 480, lineHeight: 1.5,
              }}
            >
              Pick a spot, gather the crew, drop the DoorDash link. The bot opens
              the group DM and runs the countdown for you.
            </p>
          </div>
          <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 50% 55%, rgba(154,228,255,0.35), rgba(22,163,214,0.08) 50%, transparent 70%)',
                filter: 'blur(6px)',
              }}
            />
            <img
              src="/burgerlogo.png"
              alt=""
              style={{
                position: 'relative', width: '100%', height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      </section>

      {/* BODY */}
      <main className="max-w-4xl mx-auto px-6 pb-16 flex flex-col gap-6">
        {error && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-[10px] text-sm"
            style={{
              background: 'rgba(245, 84, 58, 0.08)',
              border: '1px solid rgba(245, 84, 58, 0.35)',
              color: 'var(--text)',
            }}
          >
            <span className="flex items-center gap-2">
              <IAlert size={16} style={{ color: 'var(--coral)' }} />
              {error}
            </span>
            <button
              onClick={() => setError(null)}
              className="btn-ghost"
              aria-label="Dismiss"
            >
              <IClose size={14} />
            </button>
          </div>
        )}

        {/* Launch — the hero card */}
        <div className="card" style={{ padding: 28 }}>
          <LaunchPanel restaurants={restaurants} settings={settings} />
        </div>

        {/* Restaurants */}
        <div className="card" style={{ padding: 24 }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <Eyebrow>
                Restaurants{restaurants.length ? ` · ${restaurants.length}` : ''}
              </Eyebrow>
              <h2
                style={{
                  marginTop: 6, fontFamily: 'Manrope, sans-serif',
                  fontWeight: 700, fontSize: 20, color: 'var(--text)',
                  letterSpacing: '-0.015em',
                }}
              >
                The pool
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Used for random spins and manual picks.
              </p>
            </div>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="btn-secondary"
              type="button"
            >
              {showAdd ? <><IClose size={14} /> Cancel</> : <><IPlus size={14} /> Add</>}
            </button>
          </div>

          {showAdd && (
            <div
              className="rounded-[10px] p-4 mb-4"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
              }}
            >
              <Eyebrow>New restaurant</Eyebrow>
              <div style={{ marginTop: 10 }}>
                <RestaurantForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
              </div>
            </div>
          )}
          <RestaurantList restaurants={restaurants} onRefresh={refresh} />
        </div>

        {/* Settings — at the bottom, rarely changed */}
        <div className="card" style={{ padding: '18px 24px' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <Eyebrow>Settings</Eyebrow>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Set your lunch channel to filter the crew picker, and configure the default order deadline.
              </p>
            </div>
            <SettingsPanel settings={settings} onRefresh={refresh} />
          </div>
        </div>
      </main>
    </div>
  );
}
