const cron = require('node-cron');
const { getDb } = require('./db');
const { buildLunchCard } = require('./slack/messages');

function startScheduler(slackClient) {
  cron.schedule('* * * * *', async () => {
    try {
      const db = getDb();
      const now = new Date().toISOString();

      // Update countdown on all active (not-yet-expired) sessions
      const active = db.prepare(`
        SELECT ls.*, r.name, r.cuisine, r.doordash_url
        FROM lunch_sessions ls
        JOIN restaurants r ON r.id = ls.restaurant_id
        WHERE ls.slack_message_ts IS NOT NULL
          AND ls.slack_channel_id IS NOT NULL
          AND ls.deadline_at > ?
      `).all(now);

      for (const session of active) {
        const rsvpCount = db.prepare('SELECT COUNT(*) as count FROM rsvps WHERE session_id = ?').get(session.id).count;
        const restaurant = { name: session.name, cuisine: session.cuisine, doordash_url: session.doordash_url };
        try {
          await slackClient.chat.update({
            channel: session.slack_channel_id,
            ts: session.slack_message_ts,
            blocks: buildLunchCard({ restaurant, deadlineAt: session.deadline_at, rsvpCount, sessionId: session.id, mode: session.mode }),
            text: `Today's lunch: ${session.name}`,
          });
        } catch {
          // Message may have been deleted — skip silently
        }
      }

      // Sessions past deadline that haven't been notified yet
      const expired = db.prepare(`
        SELECT ls.*, r.name
        FROM lunch_sessions ls
        JOIN restaurants r ON r.id = ls.restaurant_id
        WHERE ls.slack_channel_id IS NOT NULL
          AND ls.deadline_at <= ?
          AND ls.times_up_sent_at IS NULL
      `).all(now);

      for (const session of expired) {
        // Mark as notified FIRST to prevent re-send on error
        db.prepare('UPDATE lunch_sessions SET times_up_sent_at = ? WHERE id = ?').run(now, session.id);
        try {
          await slackClient.chat.postMessage({
            channel: session.slack_channel_id,
            text: `⏰ Order deadline for *${session.name}* has passed! Hope everyone got their order in 🍽️`,
          });
        } catch {
          // Channel may no longer be accessible
        }
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  });
}

module.exports = { startScheduler };
