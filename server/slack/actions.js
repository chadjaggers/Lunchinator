const { getDb } = require('../db');
const { buildLunchCard } = require('./messages');

function registerActions(app) {
  app.action('rsvp', async ({ ack, action, body, client }) => {
    await ack();
    try {
      const db = getDb();
      const sessionId = parseInt(action.value, 10);
      const userId = body.user.id;

      try {
        db.prepare('INSERT INTO rsvps (session_id, slack_user_id) VALUES (?, ?)').run(sessionId, userId);
      } catch {
        // Duplicate RSVP — UNIQUE constraint, silently ignore
      }

      const session = db.prepare('SELECT * FROM lunch_sessions WHERE id = ?').get(sessionId);
      if (!session) return;

      const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(session.restaurant_id);
      if (!restaurant) return;
      const rsvpCount = db.prepare('SELECT COUNT(*) as count FROM rsvps WHERE session_id = ?').get(sessionId).count;

      await client.chat.update({
        channel: session.slack_channel_id,
        ts: session.slack_message_ts,
        blocks: buildLunchCard({ restaurant, deadlineAt: session.deadline_at, rsvpCount, sessionId, mode: session.mode }),
        text: `Today's lunch: ${restaurant.name}`,
      });
    } catch (err) {
      console.error('rsvp action error:', err);
    }
  });

  app.action('spin_again', async ({ ack, action, body, client }) => {
    await ack();
    try {
      const db = getDb();
      const sessionId = parseInt(action.value, 10);
      const session = db.prepare('SELECT * FROM lunch_sessions WHERE id = ?').get(sessionId);
      if (!session) return;

      // Pick a different restaurant
      const rows = db.prepare('SELECT * FROM restaurants WHERE id != ?').all(session.restaurant_id);
      if (!rows.length) {
        await client.chat.postMessage({
          channel: session.slack_channel_id,
          text: "There's only one restaurant in the list — can't spin again! Add more restaurants with `/lunchinator add`.",
        });
        return;
      }
      const restaurant = rows[Math.floor(Math.random() * rows.length)];

      // Update session to new restaurant, reset RSVPs
      db.prepare('UPDATE lunch_sessions SET restaurant_id = ? WHERE id = ?').run(restaurant.id, sessionId);
      db.prepare('DELETE FROM rsvps WHERE session_id = ?').run(sessionId);

      await client.chat.update({
        channel: session.slack_channel_id,
        ts: session.slack_message_ts,
        blocks: buildLunchCard({ restaurant, deadlineAt: session.deadline_at, rsvpCount: 0, sessionId, mode: 'random' }),
        text: `Today's lunch: ${restaurant.name}`,
      });
    } catch (err) {
      console.error('spin_again action error:', err);
    }
  });

  // Required: acknowledge the open_doordash URL button click (no-op, Slack requires ack)
  app.action('open_doordash', async ({ ack }) => {
    await ack();
  });
}

module.exports = registerActions;
