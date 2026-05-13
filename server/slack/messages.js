function formatDeadline(deadlineAt) {
  if (!deadlineAt) return '⏱ Deadline unknown';
  const deadline = new Date(deadlineAt);
  if (isNaN(deadline.getTime())) return '⏱ Deadline unknown';
  const diffMs = deadline - new Date();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 0) return '⏱ Order deadline passed';
  const timeStr = deadline.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `⏱ Order by ${timeStr} (${diffMin} min left)`;
}

function buildLunchCard({ restaurant, deadlineAt, rsvpCount, sessionId, mode }) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🍽️ Today's Lunch: ${restaurant.name}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Cuisine:*\n${restaurant.cuisine || 'N/A'}` },
        { type: 'mrkdwn', text: `*${formatDeadline(deadlineAt)}*` },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'open_doordash',
          text: { type: 'plain_text', text: '🛒 Open DoorDash Group Order' },
          url: restaurant.doordash_url,
          style: 'primary',
        },
        {
          type: 'button',
          action_id: 'rsvp',
          text: { type: 'plain_text', text: `🙋 I'm in (${rsvpCount})` },
          value: String(sessionId),
        },
        ...(mode === 'random' ? [{
          type: 'button',
          action_id: 'spin_again',
          text: { type: 'plain_text', text: '🎲 Spin again' },
          value: String(sessionId),
        }] : []),
      ],
    },
  ];
  return blocks;
}

module.exports = { buildLunchCard, formatDeadline };
