const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const { Op } = require('sequelize');
const { User, Lead, Client, ClientActivity, CallLog, Audit, sequelize } = require('../db');
const { apiAuth, apiAdmin, apiAdminOrAuditor } = require('../middleware/auth');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── AUTH ──────────────────────────────────────────────────────────
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

// ── USERS / STAFF ─────────────────────────────────────────────────
router.get('/users', apiAdmin, async (req, res) => {
  const users = await User.findAll({ where: { active: true }, attributes: ['id','name','username','role','createdAt'] });
  res.json({ ok: true, data: users });
});
router.post('/users', apiAdmin, async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) return res.json({ ok: false, error: 'All fields required' });
    const exists = await User.findOne({ where: { username } });
    if (exists) return res.json({ ok: false, error: 'Username taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, username, password: hash, role: role || 'staff' });
    res.json({ ok: true, data: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.put('/users/:id', apiAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.json({ ok: false, error: 'Not found' });
    const { name, username, password, role, active } = req.body;
    if (name) user.name = name;
    if (username) user.username = username;
    if (password) user.password = await bcrypt.hash(password, 10);
    if (role) user.role = role;
    if (active !== undefined) user.active = active;
    await user.save();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.delete('/users/:id', apiAdmin, async (req, res) => {
  await User.update({ active: false }, { where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── LEADS ─────────────────────────────────────────────────────────
router.get('/leads', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { status, assigned, search, category, source, page = 1, limit = 50 } = req.query;
    const where = {};
    if (user.role === 'staff') where.assigned_to = parseInt(user.id);
    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (source && source !== 'all') where.source = source;
    if (user.role === 'admin') {
      if (assigned === 'unassigned') where.assigned_to = null;
      else if (assigned && assigned !== 'all') where.assigned_to = parseInt(assigned);
    }
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { phone: { [Op.like]: `%${search}%` } }, { city: { [Op.like]: `%${search}%` } }];
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Lead.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [{ model: User, as: 'assignedStaff', attributes: ['id','name'], required: false }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ ok: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/next', apiAuth, async (req, res) => {
  try {
    const { after_id } = req.query;
    const where = { assigned_to: parseInt(req.session.user.id), status: 'pending' };
    if (after_id) where.id = { [Op.gt]: parseInt(after_id) };
    const lead = await Lead.findOne({ where, order: [['id', 'ASC']] });
    res.json({ ok: true, data: lead });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/stats', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role === 'staff' ? { assigned_to: parseInt(user.id) } : {};
    const total = await Lead.count({ where });
    const byStatus = await Lead.findAll({ where, attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['status'], raw: true });
    const staffWhere = user.role === 'staff' ? { staff_id: parseInt(user.id) } : {};
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayCalls = await CallLog.count({ where: { ...staffWhere, call_date: { [Op.gte]: todayStart } } });
    const monthCalls = await CallLog.count({ where: { ...staffWhere, call_date: { [Op.gte]: monthStart } } });
    res.json({ ok: true, total, byStatus, todayCalls, monthCalls });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/leads', apiAuth, async (req, res) => {
  try {
    const lead = await Lead.create({ ...req.body, source: req.body.source || 'cold_call' });
    res.json({ ok: true, data: lead });
  } catch (e) { res.json({ ok: false, error: e.message }); }
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
    if (!lead_ids?.length) return res.json({ ok: false, error: 'No leads' });
    await Lead.update({ assigned_to: parseInt(staff_id) }, { where: { id: { [Op.in]: lead_ids } } });
    res.json({ ok: true, count: lead_ids.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/leads/:id/log', apiAuth, async (req, res) => {
  try {
    const { status, note, callback_date, not_converted_reason } = req.body;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.json({ ok: false, error: 'Not found' });
    const user = req.session.user;
    if (user.role === 'staff' && lead.assigned_to !== parseInt(user.id))
      return res.json({ ok: false, error: 'Not your lead' });
    const upd = { status };
    if (note) upd.last_note = note;
    if (callback_date) upd.callback_date = callback_date;
    else if (status !== 'callback') upd.callback_date = null;
    if (not_converted_reason) upd.not_converted_reason = not_converted_reason;
    await lead.update(upd);
    await CallLog.create({ lead_id: lead.id, staff_id: parseInt(user.id), status, note });

    // If interested → auto create client
    let newClient = null;
    if (status === 'interested') {
      newClient = await Client.create({
        name: lead.name, phone: lead.phone, email: lead.email,
        city: lead.city, state: lead.state, category: lead.category,
        source: lead.source, lead_id: lead.id,
        assigned_to: parseInt(user.id),
        pipeline_stage: 'interested', notes: note
      });
      await ClientActivity.create({
        client_id: newClient.id, user_id: parseInt(user.id),
        type: 'stage_change', title: 'Lead marked Interested',
        description: note || 'Lead converted to client pipeline'
      });
    }

    const nextLead = await Lead.findOne({
      where: { assigned_to: parseInt(user.id), status: 'pending', id: { [Op.gt]: lead.id } },
      order: [['id', 'ASC']]
    });
    res.json({ ok: true, nextLead, newClient });
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

// ── IMPORT ────────────────────────────────────────────────────────
router.post('/import/preview', apiAdmin, upload.single('file'), async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!rows.length) return res.json({ ok: false, error: 'Empty file' });
    res.json({ ok: true, headers: Object.keys(rows[0]), preview: rows.slice(0, 5), total: rows.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/import', apiAdmin, upload.single('file'), async (req, res) => {
  try {
    const { mapping, source, category } = req.body;
    const map = JSON.parse(mapping);
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const leads = rows.map(row => ({
      name: map.name ? String(row[map.name]||'').trim() : '',
      phone: map.phone ? String(row[map.phone]||'').trim() : '',
      email: map.email ? String(row[map.email]||'').trim() : '',
      city: map.city ? String(row[map.city]||'').trim() : '',
      category: category || 'other',
      source: source || 'import',
      status: 'pending', extra: {...row}
    })).filter(l => l.name || l.phone);
    await Lead.bulkCreate(leads, { ignoreDuplicates: true });
    res.json({ ok: true, count: leads.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── CLIENTS ───────────────────────────────────────────────────────
router.get('/clients', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { stage, category, search, assigned, page = 1, limit = 50 } = req.query;
    const where = {};
    if (user.role === 'staff') {
      where[Op.or] = [{ assigned_to: parseInt(user.id) }, { managed_by: parseInt(user.id) }];
    }
    if (stage && stage !== 'all') where.pipeline_stage = stage;
    if (category && category !== 'all') where.category = category;
    if (assigned && assigned !== 'all' && user.role === 'admin') where.assigned_to = parseInt(assigned);
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { company: { [Op.like]: `%${search}%` } }, { phone: { [Op.like]: `%${search}%` } }];
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Client.findAndCountAll({
      where, limit: parseInt(limit), offset,
      include: [
        { model: User, as: 'assignedStaff', attributes: ['id','name'], required: false },
        { model: User, as: 'managedBy', attributes: ['id','name'], required: false },
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json({ ok: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/clients', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const body = { ...req.body };
    if (!body.assigned_to) body.assigned_to = parseInt(user.id);
    if (user.role === 'admin' && !body.managed_by) body.managed_by = parseInt(user.id);
    const client = await Client.create(body);
    await ClientActivity.create({
      client_id: client.id, user_id: parseInt(user.id),
      type: 'note', title: 'Client added', description: body.notes || 'New client added'
    });
    res.json({ ok: true, data: client });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/clients/:id', apiAuth, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.json({ ok: false, error: 'Not found' });
    const oldStage = client.pipeline_stage;
    await client.update(req.body);
    if (req.body.pipeline_stage && req.body.pipeline_stage !== oldStage) {
      await ClientActivity.create({
        client_id: client.id, user_id: parseInt(req.session.user.id),
        type: 'stage_change',
        title: `Stage: ${oldStage} → ${req.body.pipeline_stage}`,
        description: req.body.stage_note || ''
      });
      if (req.body.pipeline_stage === 'converted') client.converted_at = new Date();
      if (req.body.pipeline_stage === 'deployed') client.deployed_at = new Date();
      if (req.body.pipeline_stage === 'completed') client.completed_at = new Date();
      await client.save();
    }
    res.json({ ok: true, data: client });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/clients/:id', apiAuth, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assignedStaff', attributes: ['id','name'], required: false },
        { model: User, as: 'managedBy', attributes: ['id','name'], required: false },
      ]
    });
    if (!client) return res.json({ ok: false, error: 'Not found' });
    const activities = await ClientActivity.findAll({
      where: { client_id: client.id },
      include: [{ model: User, as: 'user', attributes: ['name'] }],
      order: [['date', 'DESC']]
    });
    res.json({ ok: true, data: client, activities });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/clients/:id/activity', apiAuth, async (req, res) => {
  try {
    const { type, title, description, amount, next_action, next_date } = req.body;
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.json({ ok: false, error: 'Not found' });
    const activity = await ClientActivity.create({
      client_id: parseInt(req.params.id),
      user_id: parseInt(req.session.user.id),
      type, title, description, amount, next_action, next_date
    });
    // Update next followup on client
    if (next_date) await client.update({ next_followup: next_date });
    // Update payment if it's a payment
    if (type === 'payment' && amount) {
      await client.update({ total_received: parseFloat(client.total_received) + parseFloat(amount) });
    }
    res.json({ ok: true, data: activity });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/clients/:id', apiAdmin, async (req, res) => {
  await Client.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── REVENUE / ANALYTICS ──────────────────────────────────────────
router.get('/analytics/revenue', apiAdmin, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthClients = await Client.findAll({ where: { updatedAt: { [Op.gte]: monthStart } }, raw: true });
    const totalRevenue = await Client.sum('total_received') || 0;
    const monthRevenue = await Client.sum('total_received', { where: { updatedAt: { [Op.gte]: monthStart } } }) || 0;
    const pipelineValue = await Client.sum('project_value', { where: { pipeline_stage: { [Op.notIn]: ['completed','lost'] } } }) || 0;
    const advancePaid = await Client.sum('advance_paid') || 0;

    const byStage = await Client.findAll({ attributes: ['pipeline_stage', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt'], [sequelize.fn('SUM', sequelize.col('project_value')), 'val']], group: ['pipeline_stage'], raw: true });
    const byCategory = await Client.findAll({ attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['category'], raw: true });

    // Staff performance
    const staffPerf = await Client.findAll({
      attributes: ['assigned_to', [sequelize.fn('COUNT', sequelize.col('id')), 'clients'], [sequelize.fn('SUM', sequelize.col('total_received')), 'revenue']],
      group: ['assigned_to'], raw: true
    });

    res.json({ ok: true, totalRevenue, monthRevenue, pipelineValue, advancePaid, byStage, byCategory, staffPerf });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/analytics/pipeline', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role === 'staff' ? { [Op.or]: [{ assigned_to: parseInt(user.id) }, { managed_by: parseInt(user.id) }] } : {};
    const byStage = await Client.findAll({ where, attributes: ['pipeline_stage', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['pipeline_stage'], raw: true });
    const followups = await Client.findAll({ where: { ...where, next_followup: { [Op.lte]: new Date() }, pipeline_stage: { [Op.notIn]: ['completed','lost'] } }, include: [{ model: User, as: 'assignedStaff', attributes: ['name'], required: false }], order: [['next_followup', 'ASC']], limit: 20 });
    res.json({ ok: true, byStage, followups });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── AUDITS ────────────────────────────────────────────────────────
router.get('/audits', apiAdminOrAuditor, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role === 'auditor' ? { auditor_id: parseInt(user.id) } : {};
    const { status, category, search } = req.query;
    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all') where.category = category;
    if (search) where[Op.or] = [{ company_name: { [Op.like]: `%${search}%` } }, { website_url: { [Op.like]: `%${search}%` } }];
    const audits = await Audit.findAll({
      where,
      include: [{ model: User, as: 'auditor', attributes: ['name'], required: false }],
      order: [['audit_date', 'DESC']]
    });
    res.json({ ok: true, data: audits });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/audits/stats', apiAdminOrAuditor, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role === 'auditor' ? { auditor_id: parseInt(user.id) } : {};
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const total = await Audit.count({ where });
    const today = await Audit.count({ where: { ...where, audit_date: { [Op.gte]: todayStart } } });
    const month = await Audit.count({ where: { ...where, audit_date: { [Op.gte]: monthStart } } });
    const interested = await Audit.count({ where: { ...where, status: 'interested' } });
    const converted = await Audit.count({ where: { ...where, status: 'converted' } });
    const proposalSent = await Audit.count({ where: { ...where, proposal_sent: true } });
    res.json({ ok: true, total, today, month, interested, converted, proposalSent });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/audits', apiAdminOrAuditor, async (req, res) => {
  try {
    const audit = await Audit.create({ ...req.body, auditor_id: parseInt(req.session.user.id) });
    res.json({ ok: true, data: audit });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/audits/:id', apiAdminOrAuditor, async (req, res) => {
  try {
    const audit = await Audit.findByPk(req.params.id);
    if (!audit) return res.json({ ok: false, error: 'Not found' });
    await audit.update(req.body);
    // If converted to client
    if (req.body.status === 'converted' && !audit.client_id) {
      const client = await Client.create({
        name: audit.company_name, phone: audit.phone, email: audit.email,
        website: audit.website_url, category: audit.category,
        source: 'audit', pipeline_stage: 'interested',
        assigned_to: parseInt(req.session.user.id),
        notes: `Converted from audit. ${audit.opportunities}`
      });
      await audit.update({ client_id: client.id });
    }
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/audits/:id', apiAdminOrAuditor, async (req, res) => {
  await Audit.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;

// ══════════════════════════════════════════════════════════════════
// NEW FEATURES — Tasks, Invoices, Notifications, Analytics, Password
// ══════════════════════════════════════════════════════════════════
const { Task, Invoice, Notification } = require('../db');

// ── CHANGE PASSWORD ───────────────────────────────────────────────
router.post('/change-password', apiAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.session.user.id);
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) return res.json({ ok: false, error: 'Current password is wrong' });
    if (new_password.length < 6) return res.json({ ok: false, error: 'New password must be at least 6 characters' });
    user.password = await bcrypt.hash(new_password, 10);
    await user.save();
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── TASKS ─────────────────────────────────────────────────────────
router.get('/tasks', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role === 'admin' ? {} : { assigned_to: parseInt(user.id) };
    const { status } = req.query;
    if (status && status !== 'all') where.status = status;
    const tasks = await Task.findAll({
      where, order: [['due_date','ASC'],['createdAt','DESC']],
      include: [
        { model: User, as: 'assignedTo', attributes: ['id','name'], required: false },
        { model: User, as: 'createdBy', attributes: ['id','name'], required: false },
        { model: Client, attributes: ['id','name'], required: false },
      ]
    });
    res.json({ ok: true, data: tasks });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/tasks', apiAuth, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, created_by: parseInt(req.session.user.id) });
    // Notify assigned user
    await Notification.create({ user_id: task.assigned_to, title: 'New Task Assigned', message: `"${task.title}" — Due: ${task.due_date||'No deadline'}`, type: 'task' });
    res.json({ ok: true, data: task });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/tasks/:id', apiAuth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.json({ ok: false, error: 'Not found' });
    if (req.body.status === 'done') req.body.completed_at = new Date();
    await task.update(req.body);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/tasks/:id', apiAuth, async (req, res) => {
  await Task.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── INVOICES ──────────────────────────────────────────────────────
router.get('/invoices', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role === 'staff' ? { created_by: parseInt(user.id) } : {};
    const invoices = await Invoice.findAll({
      where, order: [['createdAt','DESC']],
      include: [
        { model: Client, attributes: ['id','name','phone','email','company'], required: false },
        { model: User, as: 'createdBy', attributes: ['name'], required: false },
      ]
    });
    res.json({ ok: true, data: invoices });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/invoices', apiAuth, async (req, res) => {
  try {
    const { client_id, items, gst_percent, due_date, notes } = req.body;
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount)||0), 0);
    const gst = (subtotal * (parseFloat(gst_percent)||18)) / 100;
    const total = subtotal + gst;
    const count = await Invoice.count();
    const invoice_no = `MACTO-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
    const invoice = await Invoice.create({ invoice_no, client_id, created_by: parseInt(req.session.user.id), items, subtotal, gst_percent: gst_percent||18, gst_amount: gst, total, due_date, notes });
    // Update client stage
    await Client.update({ pipeline_stage: 'invoice_shared' }, { where: { id: client_id } });
    await ClientActivity.create({ client_id, user_id: parseInt(req.session.user.id), type: 'invoice', title: `Invoice ${invoice_no} created`, description: `Total: ₹${total.toLocaleString('en-IN')}`, amount: total });
    res.json({ ok: true, data: invoice });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/invoices/:id', apiAuth, async (req, res) => {
  try {
    const inv = await Invoice.findByPk(req.params.id);
    if (!inv) return res.json({ ok: false, error: 'Not found' });
    if (req.body.status === 'paid') req.body.paid_at = new Date();
    await inv.update(req.body);
    if (req.body.status === 'paid') {
      await Client.update({ pipeline_stage: 'advance_paid', total_received: sequelize.literal(`total_received + ${inv.total}`) }, { where: { id: inv.client_id } });
      await ClientActivity.create({ client_id: inv.client_id, user_id: parseInt(req.session.user.id), type: 'payment', title: `Invoice ${inv.invoice_no} PAID`, amount: inv.total });
    }
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/invoices/:id', apiAuth, async (req, res) => {
  try {
    const inv = await Invoice.findByPk(req.params.id, {
      include: [{ model: Client, attributes: ['id','name','phone','email','company','city','state'], required: false }, { model: User, as: 'createdBy', attributes: ['name'], required: false }]
    });
    if (!inv) return res.json({ ok: false, error: 'Not found' });
    res.json({ ok: true, data: inv });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────
router.get('/notifications', apiAuth, async (req, res) => {
  try {
    const notifs = await Notification.findAll({ where: { user_id: parseInt(req.session.user.id), read: false }, order: [['createdAt','DESC']], limit: 20 });
    res.json({ ok: true, data: notifs, count: notifs.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/notifications/read', apiAuth, async (req, res) => {
  await Notification.update({ read: true }, { where: { user_id: parseInt(req.session.user.id) } });
  res.json({ ok: true });
});

// ── ANALYTICS ─────────────────────────────────────────────────────
router.get('/analytics/conversion', apiAdmin, async (req, res) => {
  try {
    const bySource = await Lead.findAll({
      attributes: ['source', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: ['source','status'], raw: true
    });
    const sourceMap = {};
    bySource.forEach(r => {
      if (!sourceMap[r.source]) sourceMap[r.source] = { total:0, interested:0, not_interested:0 };
      sourceMap[r.source].total += parseInt(r.cnt);
      if (r.status === 'interested') sourceMap[r.source].interested += parseInt(r.cnt);
      if (r.status === 'not_interested') sourceMap[r.source].not_interested += parseInt(r.cnt);
    });
    Object.keys(sourceMap).forEach(s => {
      const d = sourceMap[s];
      d.conversion_rate = d.total ? Math.round((d.interested/d.total)*100) : 0;
    });

    const notConvertedReasons = await Lead.findAll({
      where: { status: 'not_interested', not_converted_reason: { [Op.ne]: null } },
      attributes: ['not_converted_reason'], raw: true, limit: 50
    });

    const staffStats = await CallLog.findAll({
      attributes: ['staff_id', [sequelize.fn('COUNT', sequelize.col('id')), 'total_calls']],
      group: ['staff_id'], raw: true
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const rev = await Invoice.sum('total', { where: { status: 'paid', createdAt: { [Op.gte]: d, [Op.lt]: end } } }) || 0;
      monthlyRevenue.push({ month: d.toLocaleString('en-IN',{month:'short',year:'2-digit'}), revenue: rev });
    }

    res.json({ ok: true, bySource: sourceMap, notConvertedReasons: notConvertedReasons.map(r=>r.not_converted_reason), staffStats, monthlyRevenue });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── STAFF DAILY STATS ─────────────────────────────────────────────
router.get('/analytics/daily', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const today = new Date(); today.setHours(0,0,0,0);
    const staffWhere = user.role === 'staff' ? { staff_id: parseInt(user.id) } : {};
    const todayCalls = await CallLog.count({ where: { ...staffWhere, call_date: { [Op.gte]: today } } });
    const todayInterested = await CallLog.count({ where: { ...staffWhere, status: 'interested', call_date: { [Op.gte]: today } } });
    const pendingTasks = await Task.count({ where: { assigned_to: parseInt(user.id), status: { [Op.in]: ['pending','in_progress'] } } });
    const overdueTasks = await Task.count({ where: { assigned_to: parseInt(user.id), status: { [Op.in]: ['pending','in_progress'] }, due_date: { [Op.lt]: today } } });
    const target = user.daily_target || 50;
    res.json({ ok: true, todayCalls, todayInterested, pendingTasks, overdueTasks, target, percent: Math.min(100, Math.round((todayCalls/target)*100)) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── WHATSAPP SEND ─────────────────────────────────────────────────
router.post('/whatsapp/send', apiAuth, async (req, res) => {
  try {
    const { phone, message, client_id } = req.body;
    const WABA_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    if (!WABA_TOKEN || !PHONE_ID) return res.json({ ok: false, error: 'WhatsApp not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID to Railway variables.' });
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const r = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WABA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { body: message } })
    });
    const data = await r.json();
    if (data.messages) {
      if (client_id) await ClientActivity.create({ client_id: parseInt(client_id), user_id: parseInt(req.session.user.id), type: 'whatsapp', title: 'WhatsApp sent', description: message });
      res.json({ ok: true });
    } else { res.json({ ok: false, error: JSON.stringify(data) }); }
  } catch (e) { res.json({ ok: false, error: e.message }); }
});


// ── PROPOSALS ─────────────────────────────────────────────────────
const Proposal = require('../db').Proposal || null;

router.get('/proposals', apiAuth, async (req, res) => {
  try {
    const { Proposal } = require('../db');
    const user = req.session.user;
    const where = user.role === 'staff' ? { created_by: parseInt(user.id) } : {};
    const proposals = await Proposal.findAll({
      where, order: [['createdAt','DESC']],
      include: [
        { model: Client, attributes: ['id','name','phone','email','company','city'], required: false },
        { model: User, as: 'createdBy', attributes: ['name'], required: false },
      ]
    });
    res.json({ ok: true, data: proposals });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/proposals', apiAuth, async (req, res) => {
  try {
    const { Proposal } = require('../db');
    const count = await Proposal.count();
    const proposal_no = `MPROP-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
    const proposal = await Proposal.create({ ...req.body, proposal_no, created_by: parseInt(req.session.user.id) });
    // Update client stage to proposal_shared
    if (req.body.client_id) {
      await Client.update({ pipeline_stage: 'proposal_shared' }, { where: { id: req.body.client_id } });
      await ClientActivity.create({ client_id: req.body.client_id, user_id: parseInt(req.session.user.id), type: 'proposal', title: `Proposal ${proposal_no} created`, description: req.body.project_overview||'' });
    }
    res.json({ ok: true, data: proposal });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/proposals/:id', apiAuth, async (req, res) => {
  try {
    const { Proposal } = require('../db');
    const proposal = await Proposal.findByPk(req.params.id, {
      include: [
        { model: Client, attributes: ['id','name','phone','email','company','city','state','website'], required: false },
        { model: User, as: 'createdBy', attributes: ['name'], required: false }
      ]
    });
    if (!proposal) return res.json({ ok: false, error: 'Not found' });
    res.json({ ok: true, data: proposal });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/proposals/:id', apiAuth, async (req, res) => {
  try {
    const { Proposal } = require('../db');
    const proposal = await Proposal.findByPk(req.params.id);
    if (!proposal) return res.json({ ok: false, error: 'Not found' });
    await proposal.update(req.body);
    if (req.body.status === 'accepted' && proposal.client_id) {
      await Client.update({ pipeline_stage: 'negotiation' }, { where: { id: proposal.client_id } });
    }
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/proposals/:id', apiAuth, async (req, res) => {
  try {
    const { Proposal } = require('../db');
    await Proposal.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

