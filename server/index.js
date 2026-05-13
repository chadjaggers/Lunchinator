require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const path = require('path');
const { initDb } = require('./db');
const buildApiRoutes = require('./routes/api');
const registerCommands = require('./slack/commands');
const registerModals = require('./slack/modals');
const registerActions = require('./slack/actions');
const { startScheduler } = require('./scheduler');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  socketMode: false,
});

const db = initDb();

receiver.app.use(express.json());
receiver.app.use('/api', buildApiRoutes(db));
receiver.app.use(express.static(path.join(__dirname, '../client/dist')));
receiver.app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

registerCommands(app);
registerModals(app);
registerActions(app);

(async () => {
  await app.start(process.env.PORT || 3000);
  startScheduler(app.client);
  console.log(`Lunchinator running on port ${process.env.PORT || 3000}`);
})();
