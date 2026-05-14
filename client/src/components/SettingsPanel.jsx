import { useState, useEffect } from 'react';
import { updateSettings } from '../api';

export default function SettingsPanel({ settings, onRefresh }) {
  const [minutes, setMinutes] = useState(settings.default_deadline_minutes || '30');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.default_deadline_minutes) {
      setMinutes(settings.default_deadline_minutes);
    }
  }, [settings.default_deadline_minutes]);

  async function handleSave(e) {
    e.preventDefault();
    await updateSettings({ default_deadline_minutes: minutes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="deadline-minutes" className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Default order deadline (minutes)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="deadline-minutes"
            type="number"
            min="1"
            max="180"
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            className="w-24 rounded-[8px] px-3 py-2 text-sm outline-none transition-shadow"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: '#f0f6fc',
            }}
            onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--cyan)')}
            onBlur={e => (e.target.style.boxShadow = 'none')}
          />
          <button
            type="submit"
            className="text-sm font-semibold px-4 py-2 rounded-[8px] transition-all hover:opacity-80"
            style={{
              backgroundColor: saved ? 'var(--pine)' : 'var(--cyan)',
              color: '#fff',
            }}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}
