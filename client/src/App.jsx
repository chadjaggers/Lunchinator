import { useState, useEffect } from 'react';
import { getRestaurants, addRestaurant, getSettings } from './api';
import RestaurantList from './components/RestaurantList';
import RestaurantForm from './components/RestaurantForm';
import SettingsPanel from './components/SettingsPanel';

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
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-[var(--ice)] mb-1">
        🍽️ Lunchinator
      </h1>
      <p className="text-slate-400 mb-8">
        Admin — manage restaurants and settings
      </p>

      {error && (
        <div className="bg-[var(--coral)] bg-opacity-20 border border-[var(--coral)] text-[var(--coral)] rounded px-4 py-3 mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 font-bold">✕</button>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
        <SettingsPanel settings={settings} onRefresh={refresh} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">
            Restaurants ({restaurants.length})
          </h2>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="bg-[var(--cyan)] text-white font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity text-sm"
          >
            {showAdd ? 'Cancel' : '+ Add Restaurant'}
          </button>
        </div>

        {showAdd && (
          <div className="bg-[var(--indigo)] rounded-lg p-4 mb-4">
            <RestaurantForm
              onSave={handleAdd}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        )}

        <RestaurantList restaurants={restaurants} onRefresh={refresh} />
      </section>
    </div>
  );
}
