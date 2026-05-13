function formatDeadline(deadlineAt) {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const diffMs = deadline - now;
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  const timeStr = deadline.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return diffMin > 0
    ? `⏱ Order by ${timeStr} (${diffMin} min left)`
    : `⏱ Order deadline passed`;
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
