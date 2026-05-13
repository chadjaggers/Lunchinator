import { useState } from 'react';
import { updateSettings } from '../api';

export default function SettingsPanel({ settings, onRefresh }) {
  const [minutes, setMinutes] = useState(settings.default_deadline_minutes || '30');
  const [saved, setSaved] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    await updateSettings({ default_deadline_minutes: minutes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  }

  return (
    <form onSubmit={handleSave} className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm text-slate-400">
          Default order deadline (minutes)
        </label>
        <input
          type="number"
          min="1"
          max="180"
          value={minutes}
          onChange={e => setMinutes(e.target.value)}
          className="bg-[var(--indigo)] border border-slate-600 rounded px-3 py-2 text-white w-28 focus:outline-none focus:ring-2 focus:ring-[var(--cyan)]"
        />
      </div>
      <button
        type="submit"
        className="bg-[var(--cyan)] text-white font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity"
      >
        {saved ? 'Saved ✓' : 'Save'}
      </button>
    </form>
  );
}
