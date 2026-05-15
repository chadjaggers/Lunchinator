const BASE = '/api';

export async function getRestaurants() {
  const r = await fetch(`${BASE}/restaurants`);
  return r.json();
}

export async function addRestaurant(data) {
  const r = await fetch(`${BASE}/restaurants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function updateRestaurant(id, data) {
  const r = await fetch(`${BASE}/restaurants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function deleteRestaurant(id) {
  await fetch(`${BASE}/restaurants/${id}`, { method: 'DELETE' });
}

export async function getSettings() {
  const r = await fetch(`${BASE}/settings`);
  return r.json();
}

export async function updateSettings(data) {
  const r = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

export async function getSlackUsers() {
  const r = await fetch(`${BASE}/slack/users`);
  if (!r.ok) throw new Error('Failed to fetch Slack users');
  return r.json();
}

export async function launchSession(data) {
  const r = await fetch(`${BASE}/sessions/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || 'Failed to launch session');
  }
  return r.json();
}
