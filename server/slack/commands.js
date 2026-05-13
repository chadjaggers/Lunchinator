const { getDb } = require('../db');

function registerCommands(app) {
  app.command('/lunchinator', async ({ command, ack, respond, client }) => {
    await ack();
    const [subcommand, ...args] = command.text.trim().split(/\s+/);

    if (!subcommand || subcommand === 'spin') {
      const db = getDb();
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'default_deadline_minutes'").get();
      const defaultMinutes = setting ? setting.value : '30';
      await client.views.open({
        trigger_id: command.trigger_id,
        view: buildSpinModal(defaultMinutes),
      });
      return;
    }

    if (subcommand === 'add') {
      const [name, doordash_url] = args;
      if (!name || !doordash_url) {
        return respond('Usage: `/lunchinator add "Restaurant Name" https://doordash-group-link`');
      }
      const db = getDb();
      db.prepare('INSERT INTO restaurants (name, doordash_url) VALUES (?, ?)').run(name.replace(/"/g, ''), doordash_url);
      return respond(`✅ Added *${name.replace(/"/g, '')}* to the list.`);
    }

    if (subcommand === 'remove') {
      const name = args.join(' ').replace(/"/g, '');
      const db = getDb();
      const row = db.prepare('SELECT id FROM restaurants WHERE name = ?').get(name);
      if (!row) return respond(`❌ No restaurant named "${name}" found.`);
      db.prepare('DELETE FROM restaurants WHERE id = ?').run(row.id);
      return respond(`🗑️ Removed *${name}* from the list.`);
    }

    if (subcommand === 'list') {
      const db = getDb();
      const rows = db.prepare('SELECT name, cuisine FROM restaurants ORDER BY name').all();
      if (!rows.length) return respond('No restaurants yet. Add one with `/lunchinator add "Name" [doordash-url]`');
      const list = rows.map(r => `• *${r.name}*${r.cuisine ? ` — ${r.cuisine}` : ''}`).join('\n');
      return respond(`*Current restaurant list:*\n${list}`);
    }

    if (subcommand === 'admin') {
      const adminUrl = `${process.env.APP_URL || 'http://localhost:3000'}`;
      return respond(`🔧 Manage restaurants and settings: ${adminUrl}`);
    }

    await respond('Unknown command. Try: `spin`, `add`, `remove`, `list`, `admin`');
  });
}

function buildSpinModal(defaultMinutes) {
  return {
    type: 'modal',
    callback_id: 'spin_modal',
    title: { type: 'plain_text', text: '🍽️ Lunchinator' },
    submit: { type: 'plain_text', text: "Let's eat 🍽️" },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'attendees',
        label: { type: 'plain_text', text: "Who's coming?" },
        element: {
          type: 'multi_users_select',
          action_id: 'attendees_input',
          placeholder: { type: 'plain_text', text: 'Select people...' },
        },
      },
      {
        type: 'input',
        block_id: 'restaurant_mode',
        label: { type: 'plain_text', text: 'Restaurant' },
        element: {
          type: 'radio_buttons',
          action_id: 'mode_input',
          initial_option: {
            text: { type: 'plain_text', text: "📋 I'll pick one" },
            value: 'manual',
          },
          options: [
            { text: { type: 'plain_text', text: "📋 I'll pick one" }, value: 'manual' },
            { text: { type: 'plain_text', text: '🎲 Surprise me' }, value: 'random' },
          ],
        },
      },
      {
        type: 'input',
        block_id: 'restaurant_pick',
        optional: true,
        label: { type: 'plain_text', text: 'Choose a restaurant' },
        element: {
          type: 'external_select',
          action_id: 'restaurant_input',
          placeholder: { type: 'plain_text', text: 'Choose a restaurant...' },
          min_query_length: 0,
        },
      },
      {
        type: 'input',
        block_id: 'deadline',
        label: { type: 'plain_text', text: 'Order deadline (minutes from now)' },
        element: {
          type: 'plain_text_input',
          action_id: 'deadline_input',
          initial_value: String(defaultMinutes),
          placeholder: { type: 'plain_text', text: 'e.g. 30' },
        },
      },
    ],
  };
}

module.exports = registerCommands;
