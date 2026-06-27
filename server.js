require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const bcrypt = require('bcryptjs');
const path = require('path');
const { sequelize, User } = require('./db');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const sessionStore = new SequelizeStore({ db: sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET || 'macto_crm_v2_secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true }
}));
sessionStore.sync();

app.use('/api', apiRouter);
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

async function init() {
  await sequelize.sync({ force: true }); // First run — creates all tables fresh
  const hash = await bcrypt.hash('admin123', 10);
  await User.create({ name: 'Admin', username: 'admin', password: hash, role: 'admin' });
  console.log('✅ Macto AI CRM v2 Ready — admin/admin123');
  app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
}
init().catch(console.error);
