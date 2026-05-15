import { useState, useEffect } from 'react';
import { getRestaurants, addRestaurant, getSettings } from './api';
import RestaurantList from './components/RestaurantList';
import RestaurantForm from './components/RestaurantForm';
import SettingsPanel from './components/SettingsPanel';
import LaunchPanel from './components/LaunchPanel';

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <header style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <img src="/burgerlogo.png" alt="Lunchinator" className="h-10 w-10 object-contain shrink-0" />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <img src="/phase2-wordmark.svg" alt="Phase2" className="h-7 object-contain" style={{ width: 'auto' }} />
              <span className="font-bold leading-none" style={{ color: 'var(--ice)', fontFamily: 'Manrope, sans-serif', fontSize: '1.35rem' }}>
                Lunchinator
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin Panel</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {error && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-[10px] text-sm"
            style={{ backgroundColor: 'rgba(245,84,58,0.12)', border: '1px solid var(--coral)', color: 'var(--coral)' }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 font-bold opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        <Card
          title="It's Lunch Time"
          description="Pick a restaurant, get the DoorDash link, pick the peeps, and send it off"
        >
          <LaunchPanel restaurants={restaurants} settings={settings} />
        </Card>

        <Card
          title="Settings"
          description="Configure default order deadline for lunch sessions"
        >
          <SettingsPanel settings={settings} onRefresh={refresh} />
        </Card>

        <Card
          title={`Restaurants${restaurants.length ? ` (${restaurants.length})` : ''}`}
          description="Manage the restaurant pool used for random and manual picks"
          action={
            <button
              onClick={() => setShowAdd(v => !v)}
              className="text-sm font-semibold px-4 py-1.5 rounded-[8px] transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--cyan)', color: '#fff' }}
            >
              {showAdd ? 'Cancel' : '+ Add'}
            </button>
          }
        >
          {showAdd && (
            <div
              className="rounded-[8px] p-4 mb-4"
              style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                New Restaurant
              </p>
              <RestaurantForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
            </div>
          )}
          <RestaurantList restaurants={restaurants} onRefresh={refresh} />
        </Card>
      </main>
    </div>
  );
}

function Card({ title, description, action, children }) {
  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="px-5 py-4 flex items-start justify-between gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h2 className="font-bold text-base" style={{ color: '#f0f6fc', fontFamily: 'Manrope, sans-serif' }}>
            {title}
          </h2>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
