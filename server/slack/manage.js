const { getDb } = require('../db');

function buildManageModal(db) {
  const restaurants = db.prepare('SELECT * FROM restaurants ORDER BY name').all();

  const blocks = [
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'manage_add',
          text: { type: 'plain_text', text: '➕ Add Restaurant' },
          style: 'primary',
        },
        {
          type: 'button',
          action_id: 'manage_settings',
          text: { type: 'plain_text', text: '⚙️ Settings' },
        },
      ],
    },
    { type: 'divider' },
  ];

  if (!restaurants.length) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_No restaurants yet. Hit ➕ Add Restaurant to get started._' },
    });
  } else {
    for (const r of restaurants) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*${r.name}*${r.cuisine ? `\n${r.cuisine}` : ''}` },
      });
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'manage_edit',
            text: { type: 'plain_text', text: '✏️ Edit' },
            value: String(r.id),
          },
          {
            type: 'button',
            action_id: 'manage_remove',
            text: { type: 'plain_text', text: '🗑 Remove' },
            value: String(r.id),
            style: 'danger',
            confirm: {
              title: { type: 'plain_text', text: 'Remove restaurant?' },
              text: { type: 'mrkdwn', text: `Remove *${r.name}* from the list?` },
              confirm: { type: 'plain_text', text: 'Remove' },
              deny: { type: 'plain_text', text: 'Cancel' },
            },
          },
        ],
      });
    }
  }

  return {
    type: 'modal',
    callback_id: 'manage_modal',
    title: { type: 'plain_text', text: '🍽️ Restaurants' },
    close: { type: 'plain_text', text: 'Close' },
    blocks,
  };
}

function buildAddModal(rootViewId) {
  return {
    type: 'modal',
    callback_id: 'manage_add_modal',
    title: { type: 'plain_text', text: 'Add Restaurant' },
    submit: { type: 'plain_text', text: 'Add' },
    close: { type: 'plain_text', text: 'Cancel' },
    private_metadata: rootViewId,
    blocks: [
      {
        type: 'input',
        block_id: 'name',
        label: { type: 'plain_text', text: 'Restaurant name' },
        element: {
          type: 'plain_text_input',
          action_id: 'name_input',
          placeholder: { type: 'plain_text', text: 'e.g. Chipotle' },
        },
      },
      {
        type: 'input',
        block_id: 'cuisine',
        optional: true,
        label: { type: 'plain_text', text: 'Cuisine type' },
        element: {
          type: 'plain_text_input',
          action_id: 'cuisine_input',
          placeholder: { type: 'plain_text', text: 'e.g. Mexican (optional)' },
        },
      },
    ],
  };
}

function buildEditModal(restaurant, rootViewId) {
  return {
    type: 'modal',
    callback_id: 'manage_edit_modal',
    title: { type: 'plain_text', text: 'Edit Restaurant' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    private_metadata: JSON.stringify({ rootViewId, restaurantId: restaurant.id }),
    blocks: [
      {
        type: 'input',
        block_id: 'name',
        label: { type: 'plain_text', text: 'Restaurant name' },
        element: {
          type: 'plain_text_input',
          action_id: 'name_input',
          initial_value: restaurant.name,
        },
      },
      {
        type: 'input',
        block_id: 'cuisine',
        optional: true,
        label: { type: 'plain_text', text: 'Cuisine type' },
        element: {
          type: 'plain_text_input',
          action_id: 'cuisine_input',
          initial_value: restaurant.cuisine || '',
          placeholder: { type: 'plain_text', text: 'e.g. Mexican (optional)' },
        },
      },
    ],
  };
}

function buildSettingsModal(db, rootViewId) {
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'default_deadline_minutes'").get();
  return {
    type: 'modal',
    callback_id: 'manage_settings_modal',
    title: { type: 'plain_text', text: '⚙️ Settings' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    private_metadata: rootViewId,
    blocks: [
      {
        type: 'input',
        block_id: 'deadline',
        label: { type: 'plain_text', text: 'Default order deadline (minutes)' },
        hint: { type: 'plain_text', text: 'How many minutes after spinning until the order closes.' },
        element: {
          type: 'plain_text_input',
          action_id: 'deadline_input',
          initial_value: setting ? setting.value : '30',
          placeholder: { type: 'plain_text', text: 'e.g. 30' },
        },
      },
    ],
  };
}

function registerManage(app) {
  app.action('manage_add', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.views.push({
        trigger_id: body.trigger_id,
        view: buildAddModal(body.view.id),
      });
    } catch (err) {
      console.error('manage_add error:', err);
    }
  });

  app.action('manage_edit', async ({ ack, action, body, client }) => {
    await ack();
    try {
      const db = getDb();
      const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(action.value);
      if (!restaurant) return;
      await client.views.push({
        trigger_id: body.trigger_id,
        view: buildEditModal(restaurant, body.view.id),
      });
    } catch (err) {
      console.error('manage_edit error:', err);
    }
  });

  app.action('manage_remove', async ({ ack, action, body, client }) => {
    await ack();
    try {
      const db = getDb();
      db.prepare('DELETE FROM restaurants WHERE id = ?').run(action.value);
      await client.views.update({
        view_id: body.view.id,
        view: buildManageModal(db),
      });
    } catch (err) {
      console.error('manage_remove error:', err);
    }
  });

  app.action('manage_settings', async ({ ack, body, client }) => {
    await ack();
    try {
      const db = getDb();
      await client.views.push({
        trigger_id: body.trigger_id,
        view: buildSettingsModal(db, body.view.id),
      });
    } catch (err) {
      console.error('manage_settings error:', err);
    }
  });

  app.view('manage_add_modal', async ({ ack, view, client }) => {
    await ack();
    try {
      const values = view.state.values;
      const name = values.name.name_input.value;
      const cuisine = values.cuisine?.cuisine_input?.value || null;
      const db = getDb();
      db.prepare('INSERT INTO restaurants (name, cuisine) VALUES (?, ?)').run(name, cuisine);
      await client.views.update({
        view_id: view.private_metadata,
        view: buildManageModal(db),
      });
    } catch (err) {
      console.error('manage_add_modal error:', err);
    }
  });

  app.view('manage_edit_modal', async ({ ack, view, client }) => {
    await ack();
    try {
      const values = view.state.values;
      const name = values.name.name_input.value;
      const cuisine = values.cuisine?.cuisine_input?.value || null;
      const { rootViewId, restaurantId } = JSON.parse(view.private_metadata);
      const db = getDb();
      db.prepare('UPDATE restaurants SET name = ?, cuisine = ? WHERE id = ?').run(name, cuisine, restaurantId);
      await client.views.update({
        view_id: rootViewId,
        view: buildManageModal(db),
      });
    } catch (err) {
      console.error('manage_edit_modal error:', err);
    }
  });

  app.view('manage_settings_modal', async ({ ack, view, client }) => {
    await ack();
    try {
      const minutes = parseInt(view.state.values.deadline.deadline_input.value, 10) || 30;
      const db = getDb();
      db.prepare(
        "INSERT INTO settings (key, value) VALUES ('default_deadline_minutes', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).run(String(minutes));
      await client.views.update({
        view_id: view.private_metadata,
        view: buildManageModal(db),
      });
    } catch (err) {
      console.error('manage_settings_modal error:', err);
    }
  });
}

module.exports = { registerManage, buildManageModal };
