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

app.use('/api', apiRouter);
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

async function init() {
  try {
    // Step 1 — sync all database tables
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created');

    // Step 2 — setup session store AFTER tables exist
    const sessionStore = new SequelizeStore({ db: sequelize });
    await sessionStore.sync();
    console.log('✅ Session store ready');

    // Step 3 — apply session middleware
    app.use(session({
      secret: process.env.SESSION_SECRET || 'macto_crm_v2_secret',
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true }
    }));

    // Step 4 — create default admin
    const existing = await User.findOne({ where: { username: 'admin' } });
    if (!existing) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({ name: 'Admin', username: 'admin', password: hash, role: 'admin' });
      console.log('✅ Admin created: admin / admin123');
    }

    // Step 5 — start server
    app.listen(PORT, () => console.log(`🚀 Macto AI CRM running on port ${PORT}`));

  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
}

init();
