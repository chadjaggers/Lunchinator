require('dotenv').config();
const { App } = require('@slack/bolt');
const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const { initDb } = require('./db');
const buildApiRoutes = require('./routes/api');
const registerCommands = require('./slack/commands');
const registerModals = require('./slack/modals');
const registerActions = require('./slack/actions');
const { registerManage } = require('./slack/manage');
const { startScheduler } = require('./scheduler');

const db = initDb();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const adminAuth = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASSWORD || 'changeme' },
  challenge: true,
  realm: 'Lunchinator Admin',
});

const expressApp = express();
expressApp.use(express.json());
expressApp.get('/health', (req, res) => res.send('ok'));
expressApp.use('/api', adminAuth, buildApiRoutes(db));
expressApp.use(adminAuth, express.static(path.join(__dirname, '../client/dist')));
expressApp.get('/{*path}', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

registerCommands(app);
registerModals(app);
registerActions(app);
registerManage(app);

(async () => {
  await app.start();
  const port = process.env.PORT || 3000;
  expressApp.listen(port);
  startScheduler(app.client);
  console.log(`Lunchinator running on port ${port}`);
})();
