const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { User, Lead, Client, ClientActivity, CallLog, Audit, Task, Invoice, Proposal, Notification, sequelize } = require('../db');
const { apiAuth, apiAdmin, apiAdminOrAuditor } = require('../middleware/auth');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024 } });

// ── AUTH ──────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username, active: true } });
    if (!user) return res.json({ ok: false, error: 'Invalid credentials' });
    if (!await bcrypt.compare(password, user.password)) return res.json({ ok: false, error: 'Invalid credentials' });
    req.session.user = { id: user.id, name: user.name, username: user.username, role: user.role };
    res.json({ ok: true, user: req.session.user });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
router.get('/me', apiAuth, (req, res) => res.json({ ok: true, user: req.session.user }));
router.post('/change-password', apiAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.session.user.id);
    if (!await bcrypt.compare(current_password, user.password)) return res.json({ ok: false, error: 'Current password wrong' });
    if (new_password.length < 6) return res.json({ ok: false, error: 'Min 6 characters' });
    await user.update({ password: await bcrypt.hash(new_password, 10) });
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── USERS ─────────────────────────────────────────────────────────
router.get('/users', apiAdmin, async (req, res) => {
  const users = await User.findAll({ where: { active: true }, attributes: ['id','name','username','role','daily_target','createdAt'] });
  res.json({ ok: true, data: users });
});
router.post('/users', apiAdmin, async (req, res) => {
  try {
    const { name, username, password, role, daily_target } = req.body;
    if (!name || !username || !password) return res.json({ ok: false, error: 'All fields required' });
    if (await User.findOne({ where: { username } })) return res.json({ ok: false, error: 'Username taken' });
    const user = await User.create({ name, username, password: await bcrypt.hash(password, 10), role: role||'staff', daily_target: daily_target||50 });
    res.json({ ok: true, data: user });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.put('/users/:id', apiAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.json({ ok: false, error: 'Not found' });
    if (req.body.password) req.body.password = await bcrypt.hash(req.body.password, 10);
    await user.update(req.body);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.delete('/users/:id', apiAdmin, async (req, res) => {
  await User.update({ active: false }, { where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── DASHBOARD OVERVIEW ────────────────────────────────────────────
router.get('/dashboard/overview', apiAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate()-7);

    const [totalLeads, unassigned, todayLeads, totalClients, activeClients,
           totalRevenue, monthRevenue, pendingInvValue, pendingInvCount,
           totalCalls, todayCalls, weekCalls, pendingTasks, overdueTasks,
           totalProposals, acceptedProposals, totalInvoices, paidInvoices] = await Promise.all([
      Lead.count(),
      Lead.count({ where: { assigned_to: null } }),
      Lead.count({ where: { createdAt: { [Op.gte]: today } } }),
      Client.count(),
      Client.count({ where: { pipeline_stage: { [Op.notIn]: ['completed','lost'] } } }),
      Client.sum('total_received') || 0,
      Invoice.sum('total', { where: { status: 'paid', createdAt: { [Op.gte]: monthStart } } }) || 0,
      Invoice.sum('total', { where: { status: 'sent' } }) || 0,
      Invoice.count({ where: { status: 'sent' } }),
      CallLog.count(),
      CallLog.count({ where: { call_date: { [Op.gte]: today } } }),
      CallLog.count({ where: { call_date: { [Op.gte]: weekStart } } }),
      Task.count({ where: { status: { [Op.in]: ['pending','in_progress'] } } }),
      Task.count({ where: { status: { [Op.in]: ['pending','in_progress'] }, due_date: { [Op.lt]: today } } }),
      Proposal ? Proposal.count() : 0,
      Proposal ? Proposal.count({ where: { status: 'accepted' } }) : 0,
      Invoice.count(),
      Invoice.count({ where: { status: 'paid' } }),
    ]);

    // Staff stats
    const staffUsers = await User.findAll({ where: { active: true, role: 'staff' }, attributes: ['id','name','daily_target'] });
    const staffStats = await Promise.all(staffUsers.map(async u => {
      const [total, pending, called, interested, not_interested, callback, todayCallsStaff, monthCallsStaff] = await Promise.all([
        Lead.count({ where: { assigned_to: u.id } }),
        Lead.count({ where: { assigned_to: u.id, status: 'pending' } }),
        Lead.count({ where: { assigned_to: u.id, status: 'called' } }),
        Lead.count({ where: { assigned_to: u.id, status: 'interested' } }),
        Lead.count({ where: { assigned_to: u.id, status: 'not_interested' } }),
        Lead.count({ where: { assigned_to: u.id, status: 'callback' } }),
        CallLog.count({ where: { staff_id: u.id, call_date: { [Op.gte]: today } } }),
        CallLog.count({ where: { staff_id: u.id, call_date: { [Op.gte]: monthStart } } }),
      ]);
      const convRate = total > 0 ? ((interested/total)*100).toFixed(1) : 0;
      const completion = total > 0 ? Math.round(((total-pending)/total)*100) : 0;
      return { id: u.id, name: u.name, daily_target: u.daily_target||50, total, pending, called, interested, not_interested, callback, todayCalls: todayCallsStaff, monthCalls: monthCallsStaff, convRate, completion };
    }));

    // Pipeline summary
    const pipelineByStage = await Client.findAll({ attributes: ['pipeline_stage', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt'], [sequelize.fn('SUM', sequelize.col('project_value')), 'val']], group: ['pipeline_stage'], raw: true });

    // Recent activity
    const recentActivities = await ClientActivity.findAll({ include: [{ model: User, as: 'user', attributes: ['name'], required: false }, { model: Client, attributes: ['name'], required: false }], order: [['date','DESC']], limit: 10 });
    const overduefollowups = await Client.findAll({ where: { next_followup: { [Op.lte]: now }, pipeline_stage: { [Op.notIn]: ['completed','lost'] } }, include: [{ model: User, as: 'assignedStaff', attributes: ['name'], required: false }], order: [['next_followup','ASC']], limit: 10 });

    res.json({ ok: true, totalLeads, unassigned, assigned: totalLeads-unassigned, todayLeads, totalClients, activeClients, totalRevenue: totalRevenue||0, monthRevenue: monthRevenue||0, pendingInvValue: pendingInvValue||0, pendingInvCount, totalCalls, todayCalls, weekCalls, pendingTasks, overdueTasks, totalProposals, acceptedProposals, totalInvoices, paidInvoices, staffStats, pipelineByStage, recentActivities, overduefollowups });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── LEADS ─────────────────────────────────────────────────────────
router.get('/leads', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { status, assigned, search, category, source, page=1, limit=50 } = req.query;
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
    const offset = (parseInt(page)-1)*parseInt(limit);
    const { count, rows } = await Lead.findAndCountAll({ where, limit: parseInt(limit), offset, include: [{ model: User, as: 'assignedStaff', attributes: ['id','name'], required: false }], order: [['createdAt','DESC']] });
    res.json({ ok: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count/parseInt(limit)) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.get('/leads/next', apiAuth, async (req, res) => {
  try {
    const where = { assigned_to: parseInt(req.session.user.id), status: 'pending' };
    if (req.query.after_id) where.id = { [Op.gt]: parseInt(req.query.after_id) };
    const lead = await Lead.findOne({ where, order: [['id','ASC']] });
    res.json({ ok: true, data: lead });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.get('/leads/stats', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role==='staff' ? { assigned_to: parseInt(user.id) } : {};
    const total = await Lead.count({ where });
    const byStatus = await Lead.findAll({ where, attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['status'], raw: true });
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sw = user.role==='staff' ? { staff_id: parseInt(user.id) } : {};
    const todayCalls = await CallLog.count({ where: { ...sw, call_date: { [Op.gte]: today } } });
    const monthCalls = await CallLog.count({ where: { ...sw, call_date: { [Op.gte]: monthStart } } });
    res.json({ ok: true, total, byStatus, todayCalls, monthCalls });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/leads', apiAuth, async (req, res) => {
  try { const lead = await Lead.create({ ...req.body }); res.json({ ok: true, data: lead }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});
router.put('/leads/:id', apiAuth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.json({ ok: false, error: 'Not found' });
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
router.delete('/leads/bulk', apiAdmin, async (req, res) => {
  try {
    const { lead_ids, filter_assigned, filter_source, filter_date } = req.body;
    let where = {};
    if (lead_ids?.length) where.id = { [Op.in]: lead_ids };
    else if (filter_assigned === 'unassigned') where.assigned_to = null;
    else if (filter_source) where.source = filter_source;
    else if (filter_date) {
      where[Op.and] = [sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), filter_date)];
    }
    if (!Object.keys(where).length) return res.json({ ok: false, error: 'No filter specified' });
    const count = await Lead.destroy({ where });
    res.json({ ok: true, count });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/leads/:id/log', apiAuth, async (req, res) => {
  try {
    const { status, note, callback_date, not_converted_reason } = req.body;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.json({ ok: false, error: 'Not found' });
    const upd = { status };
    if (note) upd.last_note = note;
    if (callback_date) upd.callback_date = callback_date;
    else if (status !== 'callback') upd.callback_date = null;
    if (not_converted_reason) upd.not_converted_reason = not_converted_reason;
    await lead.update(upd);
    await CallLog.create({ lead_id: lead.id, staff_id: parseInt(req.session.user.id), status, note });
    let newClient = null;
    if (status === 'interested') {
      newClient = await Client.create({ name: lead.name, phone: lead.phone, email: lead.email, city: lead.city, state: lead.state, category: lead.category, source: lead.source, lead_id: lead.id, assigned_to: parseInt(req.session.user.id), pipeline_stage: 'interested', notes: note });
      await ClientActivity.create({ client_id: newClient.id, user_id: parseInt(req.session.user.id), type: 'stage_change', title: 'Lead Interested → Added to Pipeline', description: note||'' });
    }
    const nextLead = await Lead.findOne({ where: { assigned_to: parseInt(req.session.user.id), status: 'pending', id: { [Op.gt]: lead.id } }, order: [['id','ASC']] });
    res.json({ ok: true, nextLead, newClient });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.get('/leads/:id/logs', apiAuth, async (req, res) => {
  const logs = await CallLog.findAll({ where: { lead_id: req.params.id }, include: [{ model: User, as: 'staff', attributes: ['name'] }], order: [['call_date','DESC']] });
  res.json({ ok: true, data: logs });
});
// Import batches for manage imports
router.get('/leads/batches', apiAdmin, async (req, res) => {
  try {
    const batches = await Lead.findAll({ attributes: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'date'], [sequelize.fn('COUNT', sequelize.col('id')), 'count'], 'source', [sequelize.fn('SUM', sequelize.literal("CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END")), 'unassigned']], group: [sequelize.fn('DATE', sequelize.col('createdAt')), 'source'], order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'DESC']], raw: true });
    res.json({ ok: true, data: batches });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── IMPORT ────────────────────────────────────────────────────────
router.post('/import/preview', apiAdmin, upload.single('file'), async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!rows.length) return res.json({ ok: false, error: 'Empty file' });
    res.json({ ok: true, headers: Object.keys(rows[0]), preview: rows.slice(0,5), total: rows.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/import', apiAdmin, upload.single('file'), async (req, res) => {
  try {
    const { mapping, source, category } = req.body;
    const map = JSON.parse(mapping);
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const leads = rows.map(row => ({ name: map.name ? String(row[map.name]||'').trim() : '', phone: map.phone ? String(row[map.phone]||'').trim() : '', email: map.email ? String(row[map.email]||'').trim() : '', city: map.city ? String(row[map.city]||'').trim() : '', category: category||'other', source: source||'import', status: 'pending' })).filter(l => l.name || l.phone);
    await Lead.bulkCreate(leads, { ignoreDuplicates: true });
    res.json({ ok: true, count: leads.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── CLIENTS ───────────────────────────────────────────────────────
router.get('/clients', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { stage, category, search, assigned, page=1, limit=200 } = req.query;
    const where = {};
    if (user.role==='staff') where[Op.or] = [{ assigned_to: parseInt(user.id) }, { managed_by: parseInt(user.id) }];
    if (stage && stage!=='all') where.pipeline_stage = stage;
    if (category && category!=='all') where.category = category;
    if (assigned && assigned!=='all' && user.role==='admin') where.assigned_to = parseInt(assigned);
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { company: { [Op.like]: `%${search}%` } }, { phone: { [Op.like]: `%${search}%` } }];
    const offset = (parseInt(page)-1)*parseInt(limit);
    const { count, rows } = await Client.findAndCountAll({ where, limit: parseInt(limit), offset, include: [{ model: User, as: 'assignedStaff', attributes: ['id','name'], required: false }, { model: User, as: 'managedBy', attributes: ['id','name'], required: false }], order: [['updatedAt','DESC']] });
    res.json({ ok: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count/parseInt(limit)) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/clients', apiAuth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.assigned_to) body.assigned_to = parseInt(req.session.user.id);
    const client = await Client.create(body);
    await ClientActivity.create({ client_id: client.id, user_id: parseInt(req.session.user.id), type: 'note', title: 'Client added', description: body.notes||'' });
    res.json({ ok: true, data: client });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.get('/clients/:id', apiAuth, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id, { include: [{ model: User, as: 'assignedStaff', attributes: ['id','name'], required: false }, { model: User, as: 'managedBy', attributes: ['id','name'], required: false }] });
    if (!client) return res.json({ ok: false, error: 'Not found' });
    const activities = await ClientActivity.findAll({ where: { client_id: client.id }, include: [{ model: User, as: 'user', attributes: ['name'] }], order: [['date','DESC']] });
    const tasks = await Task.findAll({ where: { client_id: client.id }, include: [{ model: User, as: 'assignedTo', attributes: ['name'], required: false }], order: [['due_date','ASC']] });
    const invoices = await Invoice.findAll({ where: { client_id: client.id }, order: [['createdAt','DESC']] });
    const proposals = Proposal ? await Proposal.findAll({ where: { client_id: client.id }, order: [['createdAt','DESC']] }) : [];
    res.json({ ok: true, data: client, activities, tasks, invoices, proposals });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.put('/clients/:id', apiAuth, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.json({ ok: false, error: 'Not found' });
    const oldStage = client.pipeline_stage;
    await client.update(req.body);
    if (req.body.pipeline_stage && req.body.pipeline_stage !== oldStage) {
      await ClientActivity.create({ client_id: client.id, user_id: parseInt(req.session.user.id), type: 'stage_change', title: `Stage: ${oldStage} → ${req.body.pipeline_stage}`, description: req.body.stage_note||'' });
    }
    res.json({ ok: true, data: client });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/clients/:id/activity', apiAuth, async (req, res) => {
  try {
    const { type, title, description, amount, next_action, next_date } = req.body;
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.json({ ok: false, error: 'Not found' });
    const activity = await ClientActivity.create({ client_id: parseInt(req.params.id), user_id: parseInt(req.session.user.id), type, title, description, amount, next_action, next_date });
    if (next_date) await client.update({ next_followup: next_date });
    if (type==='payment' && amount) await client.update({ total_received: parseFloat(client.total_received)+parseFloat(amount) });
    res.json({ ok: true, data: activity });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.delete('/clients/:id', apiAdmin, async (req, res) => {
  await Client.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── TASKS ─────────────────────────────────────────────────────────
router.get('/tasks', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role==='admin' ? {} : { assigned_to: parseInt(user.id) };
    if (req.query.status && req.query.status!=='all') where.status = req.query.status;
    const tasks = await Task.findAll({ where, order: [['due_date','ASC'],['createdAt','DESC']], include: [{ model: User, as: 'assignedTo', attributes: ['id','name'], required: false }, { model: User, as: 'createdBy', attributes: ['id','name'], required: false }, { model: Client, attributes: ['id','name'], required: false }] });
    res.json({ ok: true, data: tasks });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/tasks', apiAuth, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, created_by: parseInt(req.session.user.id) });
    if (task.assigned_to !== parseInt(req.session.user.id)) {
      await Notification.create({ user_id: task.assigned_to, title: 'New Task: '+task.title, message: `Due: ${task.due_date||'No deadline'} · Priority: ${task.priority}`, type: 'task' });
    }
    res.json({ ok: true, data: task });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.put('/tasks/:id', apiAuth, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.json({ ok: false, error: 'Not found' });
    if (req.body.status==='done') req.body.completed_at = new Date();
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
    const where = user.role==='staff' ? { created_by: parseInt(user.id) } : {};
    const invoices = await Invoice.findAll({ where, order: [['createdAt','DESC']], include: [{ model: Client, attributes: ['id','name','phone','email','company'], required: false }, { model: User, as: 'createdBy', attributes: ['name'], required: false }] });
    res.json({ ok: true, data: invoices });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/invoices', apiAuth, async (req, res) => {
  try {
    const { client_id, items, gst_percent, due_date, notes } = req.body;
    const subtotal = (items||[]).reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
    const gst = (subtotal*(parseFloat(gst_percent)||18))/100;
    const total = subtotal+gst;
    const count = await Invoice.count();
    const invoice_no = `MACTO-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
    const invoice = await Invoice.create({ invoice_no, client_id, created_by: parseInt(req.session.user.id), items, subtotal, gst_percent: gst_percent||18, gst_amount: gst, total, due_date, notes });
    await Client.update({ pipeline_stage: 'invoice_shared' }, { where: { id: client_id } });
    await ClientActivity.create({ client_id, user_id: parseInt(req.session.user.id), type: 'invoice', title: `Invoice ${invoice_no} created`, description: `Total: ${fmt(total)}`, amount: total });
    res.json({ ok: true, data: invoice });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.get('/invoices/:id', apiAuth, async (req, res) => {
  try {
    const inv = await Invoice.findByPk(req.params.id, { include: [{ model: Client, attributes: ['id','name','phone','email','company','city','state'], required: false }, { model: User, as: 'createdBy', attributes: ['name'], required: false }] });
    if (!inv) return res.json({ ok: false, error: 'Not found' });
    res.json({ ok: true, data: inv });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.put('/invoices/:id', apiAuth, async (req, res) => {
  try {
    const inv = await Invoice.findByPk(req.params.id);
    if (!inv) return res.json({ ok: false, error: 'Not found' });
    if (req.body.status==='paid') {
      req.body.paid_at = new Date();
      await Client.update({ pipeline_stage: 'advance_paid', total_received: sequelize.literal(`total_received + ${inv.total}`) }, { where: { id: inv.client_id } });
      await ClientActivity.create({ client_id: inv.client_id, user_id: parseInt(req.session.user.id), type: 'payment', title: `Invoice ${inv.invoice_no} PAID`, amount: inv.total });
    }
    await inv.update(req.body);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── PROPOSALS ────────────────────────────────────────────────────
router.get('/proposals', apiAuth, async (req, res) => {
  try {
    if (!Proposal) return res.json({ ok: true, data: [] });
    const user = req.session.user;
    const where = user.role==='staff' ? { created_by: parseInt(user.id) } : {};
    const proposals = await Proposal.findAll({ where, order: [['createdAt','DESC']], include: [{ model: Client, attributes: ['id','name','phone','email','company'], required: false }, { model: User, as: 'createdBy', attributes: ['name'], required: false }] });
    res.json({ ok: true, data: proposals });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/proposals', apiAuth, async (req, res) => {
  try {
    if (!Proposal) return res.json({ ok: false, error: 'Proposal model not available' });
    const count = await Proposal.count();
    const proposal_no = `MPROP-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
    const proposal = await Proposal.create({ ...req.body, proposal_no, created_by: parseInt(req.session.user.id) });
    if (req.body.client_id) {
      await Client.update({ pipeline_stage: 'proposal_shared' }, { where: { id: req.body.client_id } });
      await ClientActivity.create({ client_id: req.body.client_id, user_id: parseInt(req.session.user.id), type: 'proposal', title: `Proposal ${proposal_no} created`, description: req.body.project_overview||'' });
    }
    res.json({ ok: true, data: proposal });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.get('/proposals/:id', apiAuth, async (req, res) => {
  try {
    if (!Proposal) return res.json({ ok: false, error: 'Not available' });
    const proposal = await Proposal.findByPk(req.params.id, { include: [{ model: Client, attributes: ['id','name','phone','email','company','city','state','website'], required: false }, { model: User, as: 'createdBy', attributes: ['name'], required: false }] });
    if (!proposal) return res.json({ ok: false, error: 'Not found' });
    res.json({ ok: true, data: proposal });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.put('/proposals/:id', apiAuth, async (req, res) => {
  try {
    if (!Proposal) return res.json({ ok: false, error: 'Not available' });
    const proposal = await Proposal.findByPk(req.params.id);
    if (!proposal) return res.json({ ok: false, error: 'Not found' });
    if (req.body.status==='accepted') { req.body.accepted_at = new Date(); if (proposal.client_id) await Client.update({ pipeline_stage: 'negotiation' }, { where: { id: proposal.client_id } }); }
    await proposal.update(req.body);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.delete('/proposals/:id', apiAuth, async (req, res) => {
  if (Proposal) await Proposal.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── AUDITS ────────────────────────────────────────────────────────
router.get('/audits', apiAdminOrAuditor, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role==='auditor' ? { auditor_id: parseInt(user.id) } : {};
    const { status, search } = req.query;
    if (status && status!=='all') where.status = status;
    if (search) where[Op.or] = [{ company_name: { [Op.like]: `%${search}%` } }];
    const audits = await Audit.findAll({ where, include: [{ model: User, as: 'auditor', attributes: ['name'], required: false }], order: [['audit_date','DESC']] });
    res.json({ ok: true, data: audits });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.get('/audits/stats', apiAdminOrAuditor, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role==='auditor' ? { auditor_id: parseInt(user.id) } : {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [total, todayCount, month, interested, converted, proposalSent] = await Promise.all([
      Audit.count({ where }), Audit.count({ where: { ...where, audit_date: { [Op.gte]: today } } }),
      Audit.count({ where: { ...where, audit_date: { [Op.gte]: monthStart } } }),
      Audit.count({ where: { ...where, status: 'interested' } }),
      Audit.count({ where: { ...where, status: 'converted' } }),
      Audit.count({ where: { ...where, proposal_sent: true } })
    ]);
    res.json({ ok: true, total, today: todayCount, month, interested, converted, proposalSent });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.post('/audits', apiAdminOrAuditor, async (req, res) => {
  try { const audit = await Audit.create({ ...req.body, auditor_id: parseInt(req.session.user.id) }); res.json({ ok: true, data: audit }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
});
router.put('/audits/:id', apiAdminOrAuditor, async (req, res) => {
  try {
    const audit = await Audit.findByPk(req.params.id);
    if (!audit) return res.json({ ok: false, error: 'Not found' });
    await audit.update(req.body);
    if (req.body.status==='converted' && !audit.client_id) {
      const client = await Client.create({ name: audit.company_name, phone: audit.phone, email: audit.email, website: audit.website_url, category: audit.category, source: 'audit', pipeline_stage: 'interested', assigned_to: parseInt(req.session.user.id), notes: audit.opportunities });
      await audit.update({ client_id: client.id });
    }
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});
router.delete('/audits/:id', apiAdminOrAuditor, async (req, res) => {
  await Audit.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── ANALYTICS ────────────────────────────────────────────────────
router.get('/analytics/full', apiAdmin, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    // Source conversion
    const sourceData = await Lead.findAll({ attributes: ['source', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['source','status'], raw: true });
    const bySource = {};
    sourceData.forEach(r => {
      if (!bySource[r.source]) bySource[r.source] = { total:0, interested:0, not_interested:0 };
      bySource[r.source].total += parseInt(r.cnt);
      if (r.status==='interested') bySource[r.source].interested += parseInt(r.cnt);
      if (r.status==='not_interested') bySource[r.source].not_interested += parseInt(r.cnt);
    });
    Object.keys(bySource).forEach(s => { bySource[s].rate = bySource[s].total ? ((bySource[s].interested/bySource[s].total)*100).toFixed(1) : 0; });

    // Staff performance
    const staffUsers = await User.findAll({ where: { active: true }, attributes: ['id','name','role'] });
    const staffPerf = await Promise.all(staffUsers.map(async u => {
      const [totalCalls, monthCalls, lastMonthCalls, totalLeads, interested, converted, revenue, pendingTasks, doneTasks] = await Promise.all([
        CallLog.count({ where: { staff_id: u.id } }),
        CallLog.count({ where: { staff_id: u.id, call_date: { [Op.gte]: monthStart } } }),
        CallLog.count({ where: { staff_id: u.id, call_date: { [Op.between]: [lastMonthStart, lastMonthEnd] } } }),
        Lead.count({ where: { assigned_to: u.id } }),
        Lead.count({ where: { assigned_to: u.id, status: 'interested' } }),
        Client.count({ where: { assigned_to: u.id, pipeline_stage: { [Op.in]: ['converted','work_started','in_progress','deployed','completed'] } } }),
        Client.sum('total_received', { where: { assigned_to: u.id } }) || 0,
        Task.count({ where: { assigned_to: u.id, status: { [Op.in]: ['pending','in_progress'] } } }),
        Task.count({ where: { assigned_to: u.id, status: 'done' } }),
      ]);
      const convRate = totalLeads > 0 ? ((interested/totalLeads)*100).toFixed(1) : 0;
      const trend = lastMonthCalls > 0 ? Math.round(((monthCalls-lastMonthCalls)/lastMonthCalls)*100) : 0;
      const score = Math.round(parseFloat(convRate)*0.4 + converted*10 + monthCalls*0.01);
      return { id: u.id, name: u.name, role: u.role, totalCalls, monthCalls, lastMonthCalls, trend, totalLeads, interested, converted, revenue: revenue||0, pendingTasks, doneTasks, convRate, score };
    }));

    // Monthly revenue (6 months)
    const monthlyRevenue = [];
    for (let i=5; i>=0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const end = new Date(now.getFullYear(), now.getMonth()-i+1, 1);
      const rev = await Invoice.sum('total', { where: { status: 'paid', createdAt: { [Op.gte]: start, [Op.lt]: end } } }) || 0;
      monthlyRevenue.push({ month: start.toLocaleString('en-IN',{month:'short',year:'2-digit'}), revenue: rev });
    }

    // Not converted reasons
    const reasons = await Lead.findAll({ where: { status: 'not_interested', not_converted_reason: { [Op.ne]: null, [Op.ne]: '' } }, attributes: ['not_converted_reason'], raw: true, limit: 100 });

    // Pipeline value
    const pipelineValue = await Client.sum('project_value', { where: { pipeline_stage: { [Op.notIn]: ['completed','lost'] } } }) || 0;
    const totalRevenue = await Client.sum('total_received') || 0;

    res.json({ ok: true, bySource, staffPerf, monthlyRevenue, reasons: reasons.map(r=>r.not_converted_reason), pipelineValue, totalRevenue });
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

// ── WHATSAPP ──────────────────────────────────────────────────────
router.post('/whatsapp/send', apiAuth, async (req, res) => {
  try {
    const { phone, message, client_id, doc_type, doc_no } = req.body;
    const TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    if (!TOKEN || !PHONE_ID) return res.json({ ok: false, error: 'WhatsApp not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in Railway Variables.' });
    const cleanPhone = phone.replace(/[^0-9]/g,'');
    const r = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, { method:'POST', headers:{'Authorization':`Bearer ${TOKEN}`,'Content-Type':'application/json'}, body: JSON.stringify({ messaging_product:'whatsapp', to: cleanPhone, type:'text', text:{ body: message } }) });
    const data = await r.json();
    if (data.messages) {
      if (client_id) await ClientActivity.create({ client_id: parseInt(client_id), user_id: parseInt(req.session.user.id), type: 'whatsapp', title: doc_no ? `WhatsApp: ${doc_type} ${doc_no} sent` : 'WhatsApp message sent', description: message });
      res.json({ ok: true });
    } else res.json({ ok: false, error: data.error?.message||'Send failed' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// helper used in invoices route (won't run server-side but needed for reference)
function fmt(n) { return '₹'+Number(n||0).toLocaleString('en-IN'); }

module.exports = router;
