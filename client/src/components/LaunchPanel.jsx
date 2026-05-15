import { useState, useEffect } from 'react';
import { getSlackUsers, launchSession } from '../api';

export default function LaunchPanel({ restaurants, settings }) {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [doordashUrl, setDoordashUrl] = useState('');
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [deadlineMinutes, setDeadlineMinutes] = useState(30);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSlackUsers()
      .then(setUsers)
      .catch(() => setError('Could not load Slack users — check server logs.'))
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    if (settings.default_deadline_minutes) {
      setDeadlineMinutes(settings.default_deadline_minutes);
    }
  }, [settings.default_deadline_minutes]);

  function spin() {
    if (!restaurants.length) return;
    const pick = restaurants[Math.floor(Math.random() * restaurants.length)];
    setSelectedRestaurant(pick);
    setSent(null);
  }

  function togglePerson(id) {
    setSelectedPeople(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!selectedRestaurant || !selectedPeople.size) return;
    setSending(true);
    setError(null);
    setSent(null);
    try {
      const res = await launchSession({
        attendeeIds: [...selectedPeople],
        restaurantId: selectedRestaurant.id,
        doordashUrl: doordashUrl || null,
        deadlineMinutes: Number(deadlineMinutes),
      });
      setSent(res);
      setDoordashUrl('');
      setSelectedPeople(new Set());
      setSelectedRestaurant(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const canSend = selectedRestaurant && selectedPeople.size > 0;

  return (
    <form onSubmit={handleSend} className="flex flex-col gap-5">
      {error && (
        <p className="text-sm" style={{ color: 'var(--coral)' }}>{error}</p>
      )}

      {sent && (
        <div
          className="px-4 py-3 rounded-[8px] text-sm"
          style={{ backgroundColor: 'rgba(31,78,82,0.35)', border: '1px solid var(--pine)', color: 'var(--ice)' }}
        >
          ✓ Sent! <strong>{sent.restaurant.name}</strong> — group DM opened in Slack.
        </div>
      )}

      {/* Restaurant picker */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Restaurant</label>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 px-3 py-2 rounded-[8px] text-sm truncate"
            style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              color: selectedRestaurant ? '#f0f6fc' : 'var(--text-muted)',
            }}
          >
            {selectedRestaurant
              ? `${selectedRestaurant.name}${selectedRestaurant.cuisine ? ` — ${selectedRestaurant.cuisine}` : ''}`
              : 'Hit Spin to pick a restaurant'}
          </div>
          <button
            type="button"
            onClick={spin}
            disabled={!restaurants.length}
            className="shrink-0 text-sm font-semibold px-4 py-2 rounded-[8px] transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--indigo)', color: 'var(--ice)', border: '1px solid var(--border)' }}
          >
            🎲 Spin
          </button>
        </div>
        {!restaurants.length && (
          <p className="text-xs" style={{ color: 'var(--coral)' }}>Add restaurants below before spinning.</p>
        )}
      </div>

      {/* DoorDash URL */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          DoorDash group order link{' '}
          <span className="font-normal opacity-50">(optional — paste after creating on DoorDash)</span>
        </label>
        <input
          type="url"
          value={doordashUrl}
          onChange={e => setDoordashUrl(e.target.value)}
          placeholder="https://www.doordash.com/share/..."
          className="w-full rounded-[8px] px-3 py-2 text-sm outline-none transition-shadow"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: '#f0f6fc' }}
          onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--cyan)')}
          onBlur={e => (e.target.style.boxShadow = 'none')}
        />
      </div>

      {/* People picker */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Who's coming?{' '}
          {selectedPeople.size > 0 && (
            <span style={{ color: 'var(--cyan)' }}>{selectedPeople.size} selected</span>
          )}
        </label>
        {usersLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading workspace members…</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {users.map(u => {
              const checked = selectedPeople.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => togglePerson(u.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-left text-sm transition-all hover:opacity-90"
                  style={{
                    backgroundColor: checked ? 'rgba(22,163,214,0.15)' : 'var(--bg)',
                    border: `1px solid ${checked ? 'var(--cyan)' : 'var(--border)'}`,
                    color: checked ? 'var(--ice)' : '#f0f6fc',
                  }}
                >
                  {u.avatar && (
                    <img src={u.avatar} alt="" className="w-5 h-5 rounded-full shrink-0" />
                  )}
                  <span className="truncate text-xs">{u.displayName || u.realName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Deadline + Send */}
      <div className="flex items-end gap-3 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Order deadline</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="180"
              value={deadlineMinutes}
              onChange={e => setDeadlineMinutes(e.target.value)}
              className="w-20 rounded-[8px] px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: '#f0f6fc' }}
              onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--cyan)')}
              onBlur={e => (e.target.style.boxShadow = 'none')}
            />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>min</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={!canSend || sending}
          className="text-sm font-semibold px-5 py-2 rounded-[8px] transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: 'var(--cyan)', color: '#fff' }}
        >
          {sending ? 'Sending…' : 'Send to Slack →'}
        </button>
      </div>
    </form>
  );
}
