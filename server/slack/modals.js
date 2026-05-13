const { getDb } = require('../db');
const { buildLunchCard } = require('./messages');

function registerModals(app) {
  // Provides options for the external_select restaurant picker in the modal
  app.options({ action_id: 'restaurant_input' }, async ({ options, ack }) => {
    const db = getDb();
    const rows = db.prepare('SELECT id, name FROM restaurants ORDER BY name').all();
    await ack({
      options: rows.map(r => ({
        text: { type: 'plain_text', text: r.name },
        value: String(r.id),
      })),
    });
  });

  // Modal submission handler
  app.view('spin_modal', async ({ ack, view, client, body }) => {
    await ack();

    try {
      const values = view.state.values;
      const attendeeIds = values.attendees.attendees_input.selected_users;
      const mode = values.restaurant_mode.mode_input.selected_option.value;
      const deadlineMinutes = parseInt(values.deadline.deadline_input.value, 10) || 30;
      const deadlineAt = new Date(Date.now() + deadlineMinutes * 60 * 1000).toISOString();
      const organizerId = body.user.id;

      const db = getDb();
      let restaurant;

      if (mode === 'random') {
        const rows = db.prepare('SELECT * FROM restaurants').all();
        if (!rows.length) {
          await client.chat.postMessage({
            channel: organizerId,
            text: '❌ No restaurants in the list yet. Add some with `/lunchinator add`.',
          });
          return;
        }
        restaurant = rows[Math.floor(Math.random() * rows.length)];
      } else {
        const selected = values.restaurant_pick?.restaurant_input?.selected_option;
        if (!selected) {
          await client.chat.postMessage({
            channel: organizerId,
            text: '❌ Please select a restaurant from the list.',
          });
          return;
        }
        restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(selected.value);
        if (!restaurant) {
          await client.chat.postMessage({
            channel: organizerId,
            text: '❌ Restaurant not found. Please try again.',
          });
          return;
        }
      }

      // Deduplicate — include organizer in group DM
      const allUsers = [...new Set([organizerId, ...attendeeIds])];

      // Open group DM
      const convResult = await client.conversations.open({ users: allUsers.join(',') });
      const channelId = convResult.channel.id;

      // Insert session record
      const result = db.prepare(`
        INSERT INTO lunch_sessions (restaurant_id, organizer_slack_id, attendee_slack_ids, mode, deadline_at, slack_channel_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(restaurant.id, organizerId, JSON.stringify(allUsers), mode, deadlineAt, channelId);

      const sessionId = result.lastInsertRowid;

      // Post the Block Kit card
      const msgResult = await client.chat.postMessage({
        channel: channelId,
        blocks: buildLunchCard({ restaurant, deadlineAt, rsvpCount: 0, sessionId, mode }),
        text: `Today's lunch: ${restaurant.name}`,
      });

      // Save message timestamp for later updates (countdown, RSVP)
      db.prepare('UPDATE lunch_sessions SET slack_message_ts = ? WHERE id = ?')
        .run(msgResult.ts, sessionId);

    } catch (err) {
      console.error('spin_modal submission error:', err);
      try {
        await client.chat.postMessage({
          channel: body.user.id,
          text: '❌ Something went wrong setting up lunch. Please try again.',
        });
      } catch {}
    }
  });
}

module.exports = registerModals;
