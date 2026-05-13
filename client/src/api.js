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
