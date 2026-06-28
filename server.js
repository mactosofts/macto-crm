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

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

async function init() {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables created');

    const sessionStore = new SequelizeStore({ db: sequelize });
    await sessionStore.sync();
    console.log('✅ Session store ready');

    app.use(session({
      secret: process.env.SESSION_SECRET || 'macto_crm_v2_secret',
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true }
    }));

    app.use('/api', apiRouter);

    // Serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    const existing = await User.findOne({ where: { username: 'admin' } });
    if (!existing) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({ name: 'Admin', username: 'admin', password: hash, role: 'admin' });
      console.log('✅ Admin created: admin / admin123');
    }

    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Macto AI CRM running on port ${PORT}`));

  } catch (err) {
    console.error('❌ Startup error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

init();
