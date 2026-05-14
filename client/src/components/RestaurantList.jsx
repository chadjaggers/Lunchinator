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
      <p className="text-slate-400 py-4">
        No restaurants yet. Add one above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {restaurants.map(r => (
        <div key={r.id} className="bg-[var(--indigo)] rounded-lg p-4">
          {editingId === r.id ? (
            <RestaurantForm
              initial={r}
              onSave={data => handleEdit(r.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-white">{r.name}</p>
                {r.cuisine && (
                  <p className="text-sm text-slate-400">{r.cuisine}</p>
                )}
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => setEditingId(r.id)}
                  aria-label={`Edit ${r.name}`}
                  className="text-sm text-[var(--cyan)] hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  aria-label={`Remove ${r.name}`}
                  className="text-sm text-[var(--coral)] hover:underline"
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
