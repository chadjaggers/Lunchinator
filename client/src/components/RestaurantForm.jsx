import { useState } from 'react';

export default function RestaurantForm({ initial = {}, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || '');
  const [cuisine, setCuisine] = useState(initial.cuisine || '');
  const [url, setUrl] = useState(initial.doordash_url || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, cuisine, doordash_url: url });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        required
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Restaurant name"
        className="bg-[var(--indigo)] border border-[var(--cyan)] rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cyan)]"
      />
      <input
        value={cuisine}
        onChange={e => setCuisine(e.target.value)}
        placeholder="Cuisine type (optional)"
        className="bg-[var(--indigo)] border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cyan)]"
      />
      <input
        required
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="DoorDash group order URL"
        className="bg-[var(--indigo)] border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--cyan)]"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-[var(--cyan)] text-white font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-700 text-white px-4 py-2 rounded hover:opacity-90 transition-opacity"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
