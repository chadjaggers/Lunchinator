import { useState } from 'react';
import { deleteRestaurant, updateRestaurant } from '../api';
import RestaurantForm from './RestaurantForm';
import Eyebrow from './Eyebrow';
import { IEdit, ITrash } from './Icons';

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
      <div
        className="flex flex-col items-center gap-3 py-10 text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        <img
          src="/burgerlogo.png"
          alt=""
          style={{ width: 72, height: 72, opacity: 0.55 }}
        />
        <p className="text-sm">
          The pool is empty. Add a restaurant to start spinning.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {restaurants.map((r, i) => (
        <div
          key={r.id}
          style={{
            borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
          }}
        >
          {editingId === r.id ? (
            <div
              className="rounded-[10px] p-4 my-2"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
              }}
            >
              <Eyebrow>Edit restaurant</Eyebrow>
              <div style={{ marginTop: 10 }}>
                <RestaurantForm
                  initial={r}
                  onSave={data => handleEdit(r.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 py-3">
              <p
                className="font-medium text-sm truncate"
                style={{ color: 'var(--text)' }}
              >
                {r.name}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingId(r.id)}
                  aria-label={`Edit ${r.name}`}
                  className="btn-ghost"
                  title="Edit"
                >
                  <IEdit size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  aria-label={`Remove ${r.name}`}
                  className="btn-ghost btn-ghost--coral"
                  title="Remove"
                >
                  <ITrash size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
