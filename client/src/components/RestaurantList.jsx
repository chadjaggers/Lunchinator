import { useState } from 'react';
import { deleteRestaurant, updateRestaurant } from '../api';
import RestaurantForm from './RestaurantForm';

export default function RestaurantList({ restaurants, onRefresh }) {
  const [editingId, setEditingId] = useState(null);

  async function handleDelete(id) {
    if (!confirm('Remove this restaurant?')) return;
    await deleteRestaurant(id);
    onRefresh();
  }

  async function handleEdit(id, data) {
    await updateRestaurant(id, data);
    setEditingId(null);
    onRefresh();
  }

  if (!restaurants.length) {
    return (
      <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
        No restaurants yet — add one to get started.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
      {restaurants.map(r => (
        <div key={r.id} className="py-3 first:pt-0 last:pb-0">
          {editingId === r.id ? (
            <div
              className="rounded-[8px] p-4"
              style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Edit Restaurant
              </p>
              <RestaurantForm
                initial={r}
                onSave={data => handleEdit(r.id, data)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: '#f0f6fc' }}>{r.name}</p>
              </div>
              <div className="flex gap-4 shrink-0">
                <button
                  onClick={() => setEditingId(r.id)}
                  aria-label={`Edit ${r.name}`}
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--cyan)' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  aria-label={`Remove ${r.name}`}
                  className="text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--coral)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
