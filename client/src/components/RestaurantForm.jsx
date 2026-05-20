import { useState } from 'react';
import Eyebrow from './Eyebrow';

export default function RestaurantForm({ initial = {}, onSave, onCancel }) {
  const [name, setName] = useState(initial.name || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Eyebrow>
          Name <span style={{ color: 'var(--coral)' }}>*</span>
        </Eyebrow>
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Chipotle"
          className="input-base"
          autoFocus
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary" style={{ padding: '10px 18px', fontSize: 14 }}>
          Save
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
