require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const bcrypt = require('bcryptjs');
const path = require('path');
const { sequelize, User, WorkSchedule, WorkLog, WACampaign } = require('./db');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js'))  res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

async function init() {
  try {
    // One-time cleanup: drop excess indexes that accumulated from previous alter:true deploys
    try {
      const [indexes] = await sequelize.query(`
        SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME != 'PRIMARY'
        GROUP BY INDEX_NAME
      `);
      for (const idx of indexes) {
        if (idx.INDEX_NAME !== 'username') { // keep the one we actually need
          try { await sequelize.query(`ALTER TABLE users DROP INDEX \`${idx.INDEX_NAME}\``); } catch(e) {}
        }
      }
      console.log(`🧹 Cleaned up ${indexes.length} excess indexes from users table`);
    } catch(cleanupErr) {
      console.log('Index cleanup skipped:', cleanupErr.message);
    }

    await sequelize.sync({ alter: false });
    console.log('✅ Database tables created/updated');

    // Manual migration: add new columns that alter:false won't add automatically
    const migrations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20) NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150) NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#6366f1'`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS wa_followup_date DATE NULL`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_count INT DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_called_at DATETIME NULL`,
      `ALTER TABLE leads MODIFY COLUMN status ENUM('pending','called','interested','not_interested','callback','busy','no_answer','invalid','whatsapp_sent') DEFAULT 'pending'`,
      `ALTER TABLE clients ADD COLUMN IF NOT EXISTS priority ENUM('low','medium','high','vip') DEFAULT 'medium'`,
      `ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags JSON NULL`,
      `ALTER TABLE clients ADD COLUMN IF NOT EXISTS gstin VARCHAR(20) NULL`,
      `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(12,2) DEFAULT 0`,
      `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(12,2) DEFAULT 0`,
      `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(12,2) DEFAULT 0`,
      `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type ENUM('cgst_sgst','igst') DEFAULT 'cgst_sgst'`,
      `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS duration_sec INT DEFAULT 0`,
      `ALTER TABLE notifications MODIFY COLUMN type ENUM('task','client','lead','invoice','system','callback','reminder') DEFAULT 'system'`,
    ];
    for (const sql of migrations) {
      try { await sequelize.query(sql); } catch(e) { /* column likely already exists, safe to ignore */ }
    }
    console.log('✅ Manual migrations applied');

    // Create new tables (work_schedules, work_logs, wa_campaigns) if they don't exist
    try {
      await WorkSchedule.sync();
      await WorkLog.sync();
      await WACampaign.sync();
      console.log('✅ New feature tables ready');
    } catch(e) { console.log('Table sync note:', e.message); }

    const sessionStore = new SequelizeStore({ db: sequelize });
    await sessionStore.sync();
    console.log('✅ Session store ready');

    app.use(session({
      secret: process.env.SESSION_SECRET || 'macto_crm_v3_secret',
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

    // Create default admin
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
