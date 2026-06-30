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
    console.log('🔧 Starting column migrations...');
    async function safeAddColumn(table, column, definition) {
      try {
        await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`✅ ADDED: ${table}.${column}`);
      } catch(e) {
        if (e.message && (e.message.includes('Duplicate column') || e.message.includes('already exists'))) {
          console.log(`⏭️  EXISTS: ${table}.${column}`);
        } else {
          console.log(`❌ FAILED: ${table}.${column} — ${e.message}`);
        }
      }
    }

    await safeAddColumn('users', 'whatsapp', 'VARCHAR(20) NULL');
    await safeAddColumn('users', 'email', 'VARCHAR(150) NULL');
    await safeAddColumn('users', 'avatar_color', "VARCHAR(20) DEFAULT '#6366f1'");
    await safeAddColumn('leads', 'wa_followup_date', 'DATE NULL');
    await safeAddColumn('leads', 'lead_score', 'INT DEFAULT 0');
    await safeAddColumn('leads', 'call_count', 'INT DEFAULT 0');
    await safeAddColumn('leads', 'last_called_at', 'DATETIME NULL');
    await safeAddColumn('clients', 'priority', "ENUM('low','medium','high','vip') DEFAULT 'medium'");
    await safeAddColumn('clients', 'tags', 'JSON NULL');
    await safeAddColumn('clients', 'gstin', 'VARCHAR(20) NULL');
    await safeAddColumn('invoices', 'cgst_amount', 'DECIMAL(12,2) DEFAULT 0');
    await safeAddColumn('invoices', 'sgst_amount', 'DECIMAL(12,2) DEFAULT 0');
    await safeAddColumn('invoices', 'igst_amount', 'DECIMAL(12,2) DEFAULT 0');
    await safeAddColumn('invoices', 'gst_type', "ENUM('cgst_sgst','igst') DEFAULT 'cgst_sgst'");
    await safeAddColumn('call_logs', 'duration_sec', 'INT DEFAULT 0');

    // Verify the critical column actually exists now
    try {
      const [check] = await sequelize.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'wa_followup_date'`
      );
      console.log(check.length > 0 ? '✅ VERIFIED: leads.wa_followup_date exists in DB' : '❌ VERIFICATION FAILED: leads.wa_followup_date still missing!');
    } catch(e) { console.log('❌ Verification query failed:', e.message); }

    // Modify ENUMs separately (these can run repeatedly without error)
    try { await sequelize.query(`ALTER TABLE leads MODIFY COLUMN status ENUM('pending','called','interested','not_interested','callback','busy','no_answer','invalid','whatsapp_sent') DEFAULT 'pending'`); console.log('✅ ENUM updated: leads.status'); } catch(e) { console.log('❌ status enum failed:', e.message); }
    try { await sequelize.query(`ALTER TABLE notifications MODIFY COLUMN type ENUM('task','client','lead','invoice','system','callback','reminder') DEFAULT 'system'`); console.log('✅ ENUM updated: notifications.type'); } catch(e) { console.log('❌ notif type enum failed:', e.message); }

    console.log('🔧 Migrations finished');

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
