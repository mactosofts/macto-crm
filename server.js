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

sequelize.sync({ alter: true }).then(async () => {
  const sessionStore = new SequelizeStore({ db: sequelize });
  sessionStore.sync();

  app.use(session({
    secret: process.env.SESSION_SECRET || 'macto_secret_2024',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));

  app.use('/api', apiRouter);

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  const existing = await User.findOne({ where: { username: 'admin' } });
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10);
    await User.create({ name: 'Admin', username: 'admin', password: hash, role: 'admin' });
    console.log('✅ Admin created');
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Running on port ${PORT}`));
}).catch(err => {
  console.error('❌ DB Error:', err.message);
  process.exit(1);
});
