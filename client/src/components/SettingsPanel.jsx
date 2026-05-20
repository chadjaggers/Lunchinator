import { useState, useEffect } from 'react';
import { updateSettings } from '../api';
import { ICheck } from './Icons';

const labelStyle = {
  fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 11,
  letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase',
};

export default function SettingsPanel({ settings, onRefresh }) {
  const [minutes, setMinutes] = useState(settings.default_deadline_minutes || '30');
  const [channelId, setChannelId] = useState(settings.lunch_channel_id || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.default_deadline_minutes) setMinutes(settings.default_deadline_minutes);
    if (settings.lunch_channel_id !== undefined) setChannelId(settings.lunch_channel_id || '');
  }, [settings.default_deadline_minutes, settings.lunch_channel_id]);

  async function handleSave(e) {
    e.preventDefault();
    await updateSettings({ default_deadline_minutes: minutes, lunch_channel_id: channelId });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  }

  return (
    <form onSubmit={handleSave} className="flex items-end gap-4 flex-wrap">
      <div className="flex flex-col gap-2">
        <label htmlFor="channel-id" style={labelStyle}>Lunch channel ID</label>
        <input
          id="channel-id"
          type="text"
          value={channelId}
          onChange={e => setChannelId(e.target.value)}
          placeholder="e.g. C01234ABCDE"
          className="input-base"
          style={{ width: 160 }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="deadline-minutes" style={labelStyle}>Default deadline</label>
        <div className="flex items-center gap-2">
          <input
            id="deadline-minutes"
            type="number"
            min="1"
            max="180"
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            className="input-base"
            style={{ width: 80, paddingLeft: 12 }}
          />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>min</span>
        </div>
      </div>
      <button
        type="submit"
        className="btn-primary"
        style={{ padding: '10px 18px', fontSize: 14, background: saved ? 'var(--pine)' : undefined }}
      >
        {saved ? <><ICheck size={14} /> Saved</> : 'Save'}
      </button>
    </form>
  );
}
