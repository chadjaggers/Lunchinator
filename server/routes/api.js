const express = require('express');
const { buildLunchCard } = require('../slack/messages');

// Slack MPDMs cap at 8 members total (including the bot).
const SLACK_DM_MAX = 7;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function buildRouter(db, slackClient) {
  const router = express.Router();

  // Restaurants
  router.get('/restaurants', (req, res) => {
    const rows = db.prepare('SELECT * FROM restaurants ORDER BY name').all();
    res.json(rows);
  });

  router.post('/restaurants', (req, res) => {
    const { name, cuisine } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = db.prepare('INSERT INTO restaurants (name, cuisine) VALUES (?, ?)').run(name, cuisine || null);
    const row = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  });

  router.put('/restaurants/:id', (req, res) => {
    const { name, cuisine } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const existing = db.prepare('SELECT id FROM restaurants WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    db.prepare('UPDATE restaurants SET name = ?, cuisine = ? WHERE id = ?').run(name, cuisine || null, req.params.id);
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
    res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
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

  // Slack users — for the people picker in the admin panel.
  // Filtered to lunch_channel_id members when that setting is configured.
  // Requires channels:read (public) or groups:read (private) Slack scope for channel filtering.
  router.get('/slack/users', async (req, res) => {
    try {
      const allMembers = [];
      let cursor;
      do {
        const result = await slackClient.users.list({ limit: 200, ...(cursor ? { cursor } : {}) });
        allMembers.push(...(result.members || []));
        cursor = result.response_metadata?.next_cursor;
      } while (cursor);

      let users = allMembers
        .filter(u => !u.deleted && !u.is_bot && u.id !== 'USLACKBOT')
        .map(u => ({
          id: u.id,
          name: u.name,
          realName: u.real_name || u.name,
          displayName: u.profile?.display_name || u.real_name || u.name,
          avatar: u.profile?.image_48 || null,
        }))
        .sort((a, b) => a.realName.localeCompare(b.realName));

      const channelSetting = db.prepare("SELECT value FROM settings WHERE key = 'lunch_channel_id'").get();
      const channelId = channelSetting?.value;
      if (channelId) {
        try {
          const channelMemberIds = new Set();
          let chanCursor;
          do {
            const r = await slackClient.conversations.members({
              channel: channelId, limit: 200, ...(chanCursor ? { cursor: chanCursor } : {}),
            });
            for (const id of (r.members || [])) channelMemberIds.add(id);
            chanCursor = r.response_metadata?.next_cursor;
          } while (chanCursor);
          users = users.filter(u => channelMemberIds.has(u.id));
        } catch (err) {
          console.warn('Could not filter by lunch channel (check channels:read scope):', err.message);
        }
      }

      res.json(users);
    } catch (err) {
      console.error('slack/users error:', err);
      res.status(500).json({ error: 'Failed to fetch Slack users' });
    }
  });

  // Top 15 most-selected attendees across all sessions — powers the Regulars grid.
  router.get('/regulars', (req, res) => {
    const sessions = db.prepare(
      'SELECT attendee_slack_ids FROM lunch_sessions WHERE attendee_slack_ids IS NOT NULL'
    ).all();
    const counts = {};
    for (const session of sessions) {
      try {
        const ids = JSON.parse(session.attendee_slack_ids);
        for (const id of ids) counts[id] = (counts[id] || 0) + 1;
      } catch {}
    }
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([id, count]) => ({ id, count }));
    res.json(top);
  });

  // Launch a lunch session from the web admin panel
  router.post('/sessions/launch', async (req, res) => {
    const { attendeeIds, restaurantId, doordashUrl, deadlineMinutes } = req.body;
    if (!attendeeIds?.length) return res.status(400).json({ error: 'attendeeIds required' });

    try {
      let restaurant;
      if (restaurantId) {
        restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurantId);
        if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
      } else {
        const rows = db.prepare('SELECT * FROM restaurants').all();
        if (!rows.length) return res.status(400).json({ error: 'No restaurants in list' });
        restaurant = rows[Math.floor(Math.random() * rows.length)];
      }

      const minutes = Number(deadlineMinutes) || 30;
      const deadlineAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      const mode = restaurantId ? 'manual' : 'random';

      // Open one group DM per chunk of up to SLACK_DM_MAX people
      const chunks = chunkArray(attendeeIds, SLACK_DM_MAX);
      const channelIds = [];
      for (const chunk of chunks) {
        const convResult = await slackClient.conversations.open({ users: chunk.join(',') });
        channelIds.push(convResult.channel.id);
      }

      // POC: first attendee used as organizer — production needs a real admin Slack user ID from settings
      const result = db.prepare(`
        INSERT INTO lunch_sessions (restaurant_id, organizer_slack_id, attendee_slack_ids, mode, deadline_at, doordash_url, slack_channel_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(restaurant.id, attendeeIds[0], JSON.stringify(attendeeIds), mode, deadlineAt, doordashUrl || null, JSON.stringify(channelIds));

      const sessionId = result.lastInsertRowid;

      // Send the same lunch card to every group DM
      const messageTss = [];
      for (const channelId of channelIds) {
        const msgResult = await slackClient.chat.postMessage({
          channel: channelId,
          blocks: buildLunchCard({ restaurant, deadlineAt, rsvpCount: 0, sessionId, mode, doordashUrl: doordashUrl || null }),
          text: `Today's lunch: ${restaurant.name}`,
        });
        messageTss.push(msgResult.ts);
      }

      db.prepare('UPDATE lunch_sessions SET slack_message_ts = ? WHERE id = ?').run(JSON.stringify(messageTss), sessionId);

      res.json({ sessionId, restaurant });
    } catch (err) {
      console.error('sessions/launch error:', err);
      res.status(500).json({ error: err.message || 'Failed to launch session' });
    }
  });

  return router;
}

module.exports = buildRouter;
