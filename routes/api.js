// routes/api.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const { Op } = require('sequelize');
const { User, Lead, CallLog, sequelize } = require('../db');
const { apiAuth, apiAdmin } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Auth ────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username, active: true } });
    if (!user) return res.json({ ok: false, error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ ok: false, error: 'Invalid credentials' });
    req.session.user = { id: user.id, name: user.name, username: user.username, role: user.role };
    res.json({ ok: true, user: req.session.user });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
router.get('/me', apiAuth, (req, res) => res.json({ ok: true, user: req.session.user }));

// ── Staff ────────────────────────────────────────────────────────────

router.get('/staff', apiAdmin, async (req, res) => {
  const staffs = await User.findAll({ where: { role: 'staff' }, attributes: ['id','name','username','active','createdAt'] });
  const counts = await Lead.findAll({
    attributes: ['assigned_to', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
    where: { assigned_to: { [Op.ne]: null } },
    group: ['assigned_to'], raw: true
  });
  const countMap = Object.fromEntries(counts.map(c => [c.assigned_to, parseInt(c.cnt)]));
  res.json({ ok: true, data: staffs.map(s => ({ ...s.toJSON(), leadCount: countMap[s.id] || 0 })) });
});

router.post('/staff', apiAdmin, async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) return res.json({ ok: false, error: 'All fields required' });
    const exists = await User.findOne({ where: { username } });
    if (exists) return res.json({ ok: false, error: 'Username already taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username, password: hash, role: 'staff' });
    res.json({ ok: true, data: { id: user.id, name: user.name, username: user.username } });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/staff/:id', apiAdmin, async (req, res) => {
  try {
    const { name, username, password, active } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.json({ ok: false, error: 'Not found' });
    if (name) user.name = name;
    if (username) user.username = username;
    if (password) user.password = await bcrypt.hash(password, 10);
    if (active !== undefined) user.active = active;
    await user.save();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/staff/:id', apiAdmin, async (req, res) => {
  await User.update({ active: false }, { where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Leads ────────────────────────────────────────────────────────────

router.get('/leads', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { status, assigned, search, category, business_type, page = 1, limit = 50 } = req.query;
    const where = {};

    // FIX: always cast to integer for staff
    if (user.role === 'staff') where.assigned_to = parseInt(user.id);
    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (business_type && business_type !== 'all') where.business_type = business_type;
    if (user.role === 'admin') {
      if (assigned === 'unassigned') where.assigned_to = null;
      else if (assigned && assigned !== 'all') where.assigned_to = parseInt(assigned);
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { business_type: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Lead.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [{ model: User, as: 'assignedStaff', attributes: ['id','name','username'], required: false }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ ok: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// Get next pending lead for auto-dialer
router.get('/leads/next', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { after_id } = req.query;
    const where = { assigned_to: parseInt(user.id), status: 'pending' };
    if (after_id) where.id = { [Op.gt]: parseInt(after_id) };
    const lead = await Lead.findOne({ where, order: [['id', 'ASC']] });
    res.json({ ok: true, data: lead });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/filters', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role === 'staff' ? { assigned_to: parseInt(user.id) } : {};
    const cats = await Lead.findAll({ where, attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']], raw: true });
    const biz = await Lead.findAll({ where, attributes: [[sequelize.fn('DISTINCT', sequelize.col('business_type')), 'business_type']], raw: true });
    res.json({ ok: true, categories: cats.map(c => c.category).filter(Boolean), business_types: biz.map(b => b.business_type).filter(Boolean) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/stats', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role === 'staff' ? { assigned_to: parseInt(user.id) } : {};
    const total = await Lead.count({ where });
    const byStatus = await Lead.findAll({ where, attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['status'], raw: true });
    const assigned = await Lead.count({ where: { ...where, assigned_to: { [Op.ne]: null } } });
    const unassigned = await Lead.count({ where: { ...where, assigned_to: null } });

    // Today / This week / This month call counts
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const staffWhere = user.role === 'staff' ? { staff_id: parseInt(user.id) } : {};
    const todayCalls = await CallLog.count({ where: { ...staffWhere, call_date: { [Op.gte]: todayStart } } });
    const weekCalls = await CallLog.count({ where: { ...staffWhere, call_date: { [Op.gte]: weekStart } } });
    const monthCalls = await CallLog.count({ where: { ...staffWhere, call_date: { [Op.gte]: monthStart } } });

    // Meetings scheduled
    const meetings = await Lead.count({ where: { ...where, status: 'meeting_scheduled' } });

    res.json({ ok: true, total, assigned, unassigned, byStatus, todayCalls, weekCalls, monthCalls, meetings });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/leads', apiAdmin, async (req, res) => {
  try { const lead = await Lead.create({ ...req.body, source: 'manual' }); res.json({ ok: true, data: lead }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/leads/:id', apiAuth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.json({ ok: false, error: 'Not found' });
    const user = req.session.user;
    if (user.role === 'staff' && lead.assigned_to !== parseInt(user.id))
      return res.json({ ok: false, error: 'Not your lead' });
    await lead.update(req.body);
    res.json({ ok: true, data: lead });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/leads/:id', apiAdmin, async (req, res) => {
  await Lead.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.post('/leads/assign', apiAdmin, async (req, res) => {
  try {
    const { lead_ids, staff_id } = req.body;
    if (!lead_ids?.length) return res.json({ ok: false, error: 'No leads selected' });
    await Lead.update({ assigned_to: parseInt(staff_id) }, { where: { id: { [Op.in]: lead_ids } } });
    res.json({ ok: true, count: lead_ids.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── Call Log ────────────────────────────────────────────────────────

router.post('/leads/:id/log', apiAuth, async (req, res) => {
  try {
    const { status, note, callback_date } = req.body;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.json({ ok: false, error: 'Not found' });
    const user = req.session.user;
    if (user.role === 'staff' && lead.assigned_to !== parseInt(user.id))
      return res.json({ ok: false, error: 'Not your lead' });

    const upd = { status };
    if (note) upd.last_note = note;
    if (callback_date) upd.callback_date = callback_date;
    else if (status !== 'callback') upd.callback_date = null;
    await lead.update(upd);
    await CallLog.create({ lead_id: lead.id, staff_id: parseInt(user.id), status, note });

    // Return next pending lead for auto-dialer
    const nextLead = await Lead.findOne({
      where: { assigned_to: parseInt(user.id), status: 'pending', id: { [Op.gt]: lead.id } },
      order: [['id', 'ASC']]
    });
    res.json({ ok: true, nextLead });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/:id/logs', apiAuth, async (req, res) => {
  const logs = await CallLog.findAll({
    where: { lead_id: req.params.id },
    include: [{ model: User, as: 'staff', attributes: ['name'] }],
    order: [['call_date', 'DESC']]
  });
  res.json({ ok: true, data: logs });
});

// ── Import ──────────────────────────────────────────────────────────

router.post('/import', apiAdmin, upload.single('file'), async (req, res) => {
  try {
    const { mapping, source, category } = req.body;
    const map = JSON.parse(mapping);
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.csv','.xlsx','.xls'].includes(ext)) return res.json({ ok: false, error: 'Only CSV, XLS, XLSX supported' });
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const leads = rows.map(row => ({
      name: map.name ? String(row[map.name]||'').trim() : '',
      phone: map.phone ? String(row[map.phone]||'').trim() : '',
      email: map.email ? String(row[map.email]||'').trim() : '',
      city: map.city ? String(row[map.city]||'').trim() : '',
      state: map.state ? String(row[map.state]||'').trim() : '',
      category: map.category ? String(row[map.category]||category||'').trim() : (category||''),
      business_type: map.business_type ? String(row[map.business_type]||'').trim() : '',
      source: source||file.originalname, status: 'pending', extra: {...row}
    })).filter(l => l.name || l.phone);
    await Lead.bulkCreate(leads, { ignoreDuplicates: true });
    res.json({ ok: true, count: leads.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/import/preview', apiAdmin, upload.single('file'), async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!rows.length) return res.json({ ok: false, error: 'Empty file' });
    res.json({ ok: true, headers: Object.keys(rows[0]), preview: rows.slice(0, 5), total: rows.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

module.exports = router;
