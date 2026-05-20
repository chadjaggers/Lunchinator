import { useState, useEffect, useRef, useMemo } from 'react';
import { getSlackUsers, getRegulars, launchSession } from '../api';
import Eyebrow from './Eyebrow';
import {
  IDice, ISearch, ILink, ISend, ICheck, IClose, IUsers, IAlert,
} from './Icons';

const DEADLINE_PRESETS = [15, 30, 45, 60];

export default function LaunchPanel({ restaurants, settings }) {
  const [users, setUsers] = useState([]);
  const [regularsData, setRegularsData] = useState([]); // [{id, count}] sorted by count desc
  const [usersLoading, setUsersLoading] = useState(true);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [allCrewExpanded, setAllCrewExpanded] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [doordashUrl, setDoordashUrl] = useState('');
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [deadlineMinutes, setDeadlineMinutes] = useState(30);
  const [deadlineCustom, setDeadlineCustom] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  async function loadData() {
    setUsersLoading(true);
    try {
      const [u, r] = await Promise.all([getSlackUsers(), getRegulars()]);
      setUsers(u);
      setRegularsData(r);
    } catch {
      setError('Could not load Slack users — check server logs.');
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (settings.default_deadline_minutes) {
      setDeadlineMinutes(settings.default_deadline_minutes);
      setDeadlineCustom(!DEADLINE_PRESETS.includes(Number(settings.default_deadline_minutes)));
    }
  }, [settings.default_deadline_minutes]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        if (!selectedRestaurant) setRestaurantSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedRestaurant]);

  function selectRestaurant(r) {
    setSelectedRestaurant(r);
    setRestaurantSearch(r.name);
    setShowDropdown(false);
    setSent(null);
  }

  function spin() {
    if (!restaurants.length) return;
    const pick = restaurants[Math.floor(Math.random() * restaurants.length)];
    selectRestaurant(pick);
  }

  function clearRestaurant() {
    setSelectedRestaurant(null);
    setRestaurantSearch('');
    setShowDropdown(false);
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
      setRestaurantSearch('');
      // Refresh regulars so counts update after the send
      getRegulars().then(setRegularsData).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const filteredRestaurants = useMemo(() =>
    restaurants.filter(r => r.name.toLowerCase().includes(restaurantSearch.toLowerCase())),
    [restaurants, restaurantSearch],
  );

  // Cross-reference regulars with channel-filtered users; preserve count order
  const regularUsers = useMemo(() =>
    regularsData.map(r => users.find(u => u.id === r.id)).filter(Boolean),
    [regularsData, users],
  );
  const regularIds = useMemo(() => new Set(regularUsers.map(u => u.id)), [regularUsers]);

  // All Crew = channel members who aren't Regulars
  const allCrewUsers = useMemo(() =>
    users.filter(u => !regularIds.has(u.id)),
    [users, regularIds],
  );

  const filteredAllCrew = useMemo(() => {
    const q = peopleSearch.toLowerCase();
    if (!q) return allCrewUsers;
    return allCrewUsers.filter(u =>
      u.realName.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q),
    );
  }, [allCrewUsers, peopleSearch]);

  const selectedUserList = useMemo(
    () => users.filter(u => selectedPeople.has(u.id)),
    [users, selectedPeople],
  );

  const canSend = selectedRestaurant && selectedPeople.size > 0;
  const stepRestaurantDone = Boolean(selectedRestaurant);
  const stepPeopleDone = selectedPeople.size > 0;

  // When there are no regulars yet, show the full crew list directly (not collapsed)
  const noRegularsYet = regularUsers.length === 0;

  return (
    <form onSubmit={handleSend} className="flex flex-col gap-7">
      {/* Step indicator */}
      <div className="flex items-center gap-3 text-xs">
        <Step n={1} label="Restaurant" active={stepRestaurantDone} />
        <StepLine />
        <Step n={2} label="Crew" active={stepPeopleDone} />
        <StepLine />
        <Step n={3} label="Send" active={canSend} />
      </div>

      {error && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-[10px] text-sm"
          style={{ background: 'rgba(245, 84, 58, 0.08)', border: '1px solid rgba(245, 84, 58, 0.35)', color: 'var(--coral)' }}
        >
          <IAlert size={16} style={{ marginTop: 1 }} />
          <span style={{ color: 'var(--text)' }}>{error}</span>
        </div>
      )}

      {sent && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-[10px] text-sm"
          style={{ background: 'rgba(31, 78, 82, 0.25)', border: '1px solid rgba(31, 78, 82, 0.5)' }}
        >
          <ICheck size={16} style={{ color: 'var(--ice)', marginTop: 1 }} />
          <span style={{ color: 'var(--text)' }}>
            Sent to Slack — <strong>{sent.restaurant.name}</strong> group DM opened.
          </span>
        </div>
      )}

      {/* RESTAURANT */}
      <div className="flex flex-col gap-2">
        <Eyebrow>Restaurant</Eyebrow>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 input-wrap" ref={dropdownRef}>
            <span className="input-icon"><ISearch size={16} /></span>
            <input
              type="text"
              value={restaurantSearch}
              onChange={e => {
                setRestaurantSearch(e.target.value);
                setSelectedRestaurant(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search or type a restaurant name…"
              className="input-base"
              data-picked={selectedRestaurant ? 'true' : 'false'}
              style={{ paddingRight: selectedRestaurant ? 86 : 38 }}
            />
            {selectedRestaurant && (
              <span className="input-trailing" style={{ gap: 4 }}>
                <span
                  className="text-[10px] font-semibold"
                  style={{
                    fontFamily: 'Manrope, sans-serif', letterSpacing: '0.08em',
                    color: 'var(--cyan)', background: 'rgba(22,163,214,0.10)',
                    padding: '3px 8px', borderRadius: 999,
                  }}
                >PICKED</span>
                <button type="button" onClick={clearRestaurant} className="btn-ghost" aria-label="Clear restaurant">
                  <IClose size={14} />
                </button>
              </span>
            )}
            {showDropdown && restaurantSearch && filteredRestaurants.length > 0 && (
              <div
                className="absolute z-10 left-0 right-0 mt-1 rounded-[10px] overflow-hidden"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
              >
                {filteredRestaurants.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={() => selectRestaurant(r)}
                    className="w-full text-left px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,163,214,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={spin} disabled={!restaurants.length} className="btn-secondary">
            <IDice size={16} /> {selectedRestaurant ? 'Spin again' : 'Surprise me'}
          </button>
        </div>
        {!restaurants.length && (
          <p className="text-xs" style={{ color: 'var(--coral)' }}>Add restaurants below before spinning.</p>
        )}
      </div>

      {/* DOORDASH LINK */}
      <div className="flex flex-col gap-2">
        <Eyebrow>DoorDash group order</Eyebrow>
        <div className="input-wrap">
          <span className="input-icon"><ILink size={16} /></span>
          <input
            type="url"
            value={doordashUrl}
            onChange={e => setDoordashUrl(e.target.value)}
            placeholder="https://www.doordash.com/share/…"
            className="input-base"
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Optional — paste after creating the group order in DoorDash.
        </p>
      </div>

      {/* CREW */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <Eyebrow>
            Crew{selectedPeople.size > 0 ? ` · ${selectedPeople.size} selected` : ''}
          </Eyebrow>
          {selectedPeople.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedPeople(new Set())}
              className="text-xs"
              style={{ color: 'var(--text-muted)', background: 'transparent', border: 0, cursor: 'pointer' }}
            >
              Clear all
            </button>
          )}
        </div>

        {usersLoading ? (
          <UserGridSkeleton />
        ) : (
          <>
            {/* Selected chip strip */}
            {selectedUserList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUserList.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => togglePerson(u.id)}
                    className="flex items-center gap-2 rounded-full text-[13px] transition-colors"
                    style={{
                      background: 'rgba(22, 163, 214, 0.10)',
                      border: '1px solid rgba(22, 163, 214, 0.40)',
                      color: 'var(--ice)',
                      padding: '3px 10px 3px 3px',
                      cursor: 'pointer',
                    }}
                  >
                    <Avatar user={u} size={22} />
                    <span>{u.displayName || u.realName}</span>
                    <IClose size={12} style={{ opacity: 0.6, marginLeft: 2 }} />
                  </button>
                ))}
              </div>
            )}

            {/* REGULARS — shown when we have history */}
            {regularUsers.length > 0 && (
              <div className="flex flex-col gap-2">
                <Eyebrow color="var(--ice)">Regulars</Eyebrow>
                <UserGrid users={regularUsers} selectedPeople={selectedPeople} onToggle={togglePerson} />
              </div>
            )}

            {/* ALL CREW — collapsible when regulars exist, always open when they don't */}
            {noRegularsYet ? (
              <div className="flex flex-col gap-2">
                <div className="input-wrap">
                  <span className="input-icon"><ISearch size={16} /></span>
                  <input
                    type="text"
                    value={peopleSearch}
                    onChange={e => setPeopleSearch(e.target.value)}
                    placeholder="Search teammates…"
                    className="input-base"
                  />
                </div>
                <UserGrid users={filteredAllCrew} selectedPeople={selectedPeople} onToggle={togglePerson} />
                {filteredAllCrew.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matches.</p>
                )}
              </div>
            ) : allCrewUsers.length > 0 && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setAllCrewExpanded(v => !v)}
                  className="flex items-center gap-2 self-start"
                  style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}
                >
                  <Eyebrow color="var(--text-muted)">
                    {allCrewExpanded ? '▾' : '▸'} All crew · {allCrewUsers.length} others
                  </Eyebrow>
                </button>

                {allCrewExpanded && (
                  <>
                    <div className="input-wrap">
                      <span className="input-icon"><ISearch size={16} /></span>
                      <input
                        type="text"
                        value={peopleSearch}
                        onChange={e => setPeopleSearch(e.target.value)}
                        placeholder="Search teammates…"
                        className="input-base"
                      />
                    </div>
                    <UserGrid users={filteredAllCrew} selectedPeople={selectedPeople} onToggle={togglePerson} />
                    {filteredAllCrew.length === 0 && (
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matches.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* DEADLINE + SEND */}
      <div
        className="flex flex-wrap items-end gap-6 pt-5"
        style={{ borderTop: '1px solid var(--border-soft)' }}
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>Deadline</Eyebrow>
          <div className="flex items-center gap-2 flex-wrap">
            {DEADLINE_PRESETS.map(m => {
              const active = !deadlineCustom && Number(deadlineMinutes) === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setDeadlineMinutes(m); setDeadlineCustom(false); }}
                  className="px-3.5 py-2 rounded-[8px] text-sm transition-colors"
                  style={{
                    fontFamily: 'Manrope, sans-serif', fontWeight: 600,
                    background: active ? 'rgba(22,163,214,0.10)' : 'transparent',
                    border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
                    color: active ? 'var(--ice)' : 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  {m}m
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setDeadlineCustom(true)}
              className="px-3.5 py-2 rounded-[8px] text-sm transition-colors"
              style={{
                fontFamily: 'Manrope, sans-serif', fontWeight: 600,
                background: deadlineCustom ? 'rgba(22,163,214,0.10)' : 'transparent',
                border: `1px dashed ${deadlineCustom ? 'var(--cyan)' : 'var(--border)'}`,
                color: deadlineCustom ? 'var(--ice)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Custom…
            </button>
            {deadlineCustom && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={deadlineMinutes}
                  onChange={e => setDeadlineMinutes(e.target.value)}
                  className="input-base"
                  style={{ width: 80, paddingLeft: 12 }}
                />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>min</span>
              </div>
            )}
          </div>
        </div>

        <div className="ml-auto flex flex-col items-end gap-2">
          {canSend && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Sending to <strong style={{ color: 'var(--text)' }}>{selectedPeople.size} {selectedPeople.size === 1 ? 'person' : 'people'}</strong>
              {' · '}deadline in <strong style={{ color: 'var(--text)' }}>{deadlineMinutes} min</strong>
            </div>
          )}
          <button type="submit" disabled={!canSend || sending} className="btn-primary">
            <ISend size={16} /> {sending ? 'Sending…' : 'Send to Slack'}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ===================== Subcomponents ===================== */

function UserGrid({ users, selectedPeople, onToggle }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
      {users.map(u => {
        const checked = selectedPeople.has(u.id);
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onToggle(u.id)}
            className="relative flex flex-col items-center gap-2 rounded-[10px] transition-colors"
            style={{
              background: checked ? 'rgba(22, 163, 214, 0.08)' : 'var(--bg-1)',
              border: `1px solid ${checked ? 'rgba(22, 163, 214, 0.45)' : 'var(--border)'}`,
              color: checked ? 'var(--ice)' : 'var(--text)',
              padding: '12px 10px',
              cursor: 'pointer',
            }}
          >
            <Avatar user={u} size={40} />
            <span className="text-xs font-medium text-center leading-tight truncate w-full" title={u.realName}>
              {u.displayName || u.realName}
            </span>
            {checked && (
              <span
                className="absolute flex items-center justify-center"
                style={{ top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'var(--cyan)', color: '#fff' }}
              >
                <ICheck size={11} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Step({ n, label, active }) {
  return (
    <div className="flex items-center gap-2" style={{ color: active ? 'var(--cyan)' : 'var(--text-dim)' }}>
      <span
        className="flex items-center justify-center"
        style={{
          width: 22, height: 22, borderRadius: '50%',
          background: active ? 'rgba(22,163,214,0.12)' : 'transparent',
          border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
          fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 11,
        }}
      >{n}</span>
      <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, letterSpacing: '0.02em' }}>
        {label}
      </span>
    </div>
  );
}

function StepLine() {
  return <div style={{ flex: '0 1 60px', height: 1, background: 'var(--border-soft)' }} />;
}

function Avatar({ user, size = 36 }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  const name = user.realName || user.displayName || user.name || '?';
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  let h = 0;
  for (let i = 0; i < (user.id || name).length; i++) h = (h + (user.id || name).charCodeAt(i) * 7) % 360;
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, hsl(${h}, 55%, 55%), hsl(${(h + 40) % 360}, 55%, 38%))`,
        color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Manrope, sans-serif', fontWeight: 700,
        fontSize: size * 0.38, flexShrink: 0,
      }}
    >{initials}</span>
  );
}

function UserGridSkeleton() {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-1)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            opacity: 1 - (i * 0.06),
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--border-soft)' }} />
          <div style={{ width: '70%', height: 10, borderRadius: 4, background: 'var(--border-soft)' }} />
        </div>
      ))}
    </div>
  );
}
