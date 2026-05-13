import { useState, useEffect } from 'react';
import { getRestaurants, addRestaurant, getSettings } from './api';
import RestaurantList from './components/RestaurantList';
import RestaurantForm from './components/RestaurantForm';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [settings, setSettings] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  async function refresh() {
    const [r, s] = await Promise.all([getRestaurants(), getSettings()]);
    setRestaurants(r);
    setSettings(s);
  }

  useEffect(() => { refresh(); }, []);

  async function handleAdd(data) {
    await addRestaurant(data);
    setShowAdd(false);
    refresh();
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-[var(--ice)] mb-1">
        🍽️ Lunchinator
      </h1>
      <p className="text-slate-400 mb-8">
        Admin — manage restaurants and settings
      </p>

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
