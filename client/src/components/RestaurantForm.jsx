import { useState } from 'react';

export default function RestaurantForm({ initial = {}, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || '');
  const [cuisine, setCuisine] = useState(initial.cuisine || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, cuisine });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Name <span style={{ color: 'var(--coral)' }}>*</span>
        </label>
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Chipotle"
          className="w-full rounded-[8px] px-3 py-2 text-sm outline-none transition-shadow"
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            color: '#f0f6fc',
          }}
          onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--cyan)')}
          onBlur={e => (e.target.style.boxShadow = 'none')}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Cuisine <span className="opacity-50 font-normal">(optional)</span>
        </label>
        <input
          value={cuisine}
          onChange={e => setCuisine(e.target.value)}
          placeholder="e.g. Mexican"
          className="w-full rounded-[8px] px-3 py-2 text-sm outline-none transition-shadow"
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            color: '#f0f6fc',
          }}
          onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--cyan)')}
          onBlur={e => (e.target.style.boxShadow = 'none')}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="text-sm font-semibold px-4 py-2 rounded-[8px] transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--cyan)', color: '#fff' }}
        >
          Save
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-[8px] transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
