const express = require('express');

function buildRouter(db) {
  const router = express.Router();

  // Restaurants
  router.get('/restaurants', (req, res) => {
    const rows = db.prepare('SELECT * FROM restaurants ORDER BY name').all();
    res.json(rows);
  });

  router.post('/restaurants', (req, res) => {
    const { name, cuisine, doordash_url } = req.body;
    if (!name || !doordash_url) {
      return res.status(400).json({ error: 'name and doordash_url required' });
    }
    const result = db.prepare(
      'INSERT INTO restaurants (name, cuisine, doordash_url) VALUES (?, ?, ?)'
    ).run(name, cuisine || null, doordash_url);
    const row = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  });

  router.put('/restaurants/:id', (req, res) => {
    const { name, cuisine, doordash_url } = req.body;
    if (!name || !doordash_url) {
      return res.status(400).json({ error: 'name and doordash_url required' });
    }
    const existing = db.prepare('SELECT id FROM restaurants WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    db.prepare(
      'UPDATE restaurants SET name = ?, cuisine = ?, doordash_url = ? WHERE id = ?'
    ).run(name, cuisine || null, doordash_url, req.params.id);
    const row = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id);
    res.json(row);
  });

  router.delete('/restaurants/:id', (req, res) => {
    db.prepare('DELETE FROM restaurants WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  // Settings
  router.get('/settings', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(settings);
  });

  router.put('/settings', (req, res) => {
    for (const [key, value] of Object.entries(req.body)) {
      db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run(key, String(value));
    }
    const rows = db.prepare('SELECT key, value FROM settings').all();
    res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
  });

  return router;
}

module.exports = buildRouter;
