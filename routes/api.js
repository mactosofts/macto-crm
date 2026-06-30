const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  sequelize, User, Lead, Client, ClientActivity, CallLog,
  Audit, Task, Invoice, Proposal, Notification, WACampaign,
  WorkSchedule, WorkLog,
  calculateLeadScore, calculateGST
} = require('../db');
const { apiAuth, apiAdmin, apiAdminOrAuditor } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024 } });

// ── WHATSAPP NOTIFICATION HELPER ─────────────────────────────────
async function sendWANotification(phone, message) {
  try {
    const TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    if (!TOKEN || !PHONE_ID || !phone) return false;
    const cleanPhone = phone.replace(/[^0-9]/g,'');
    if(!cleanPhone || cleanPhone.length < 10) return false;
    const r = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
      method:'POST',
      headers:{'Authorization':`Bearer ${TOKEN}`,'Content-Type':'application/json'},
      body: JSON.stringify({ messaging_product:'whatsapp', to: cleanPhone, type:'text', text:{ body: message } })
    });
    const data = await r.json();
    return !!data.messages;
  } catch(e) { console.error('WA Notification error:', e.message); return false; }
}

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
router.get('/me', apiAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id, { attributes: ['id','name','username','role','daily_target','email','avatar_color'] });
    if(user) {
      const freshUser = { id: user.id, name: user.name, username: user.username, role: user.role, daily_target: user.daily_target||50, email: user.email, avatar_color: user.avatar_color };
      req.session.user = freshUser;
      res.json({ ok: true, user: freshUser });
    } else {
      res.json({ ok: true, user: req.session.user });
    }
  } catch(e) { res.json({ ok: true, user: req.session.user }); }
});

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
  const users = await User.findAll({ where: { active: true }, attributes: ['id','name','username','role','daily_target','email','avatar_color','whatsapp','createdAt'] });
  res.json({ ok: true, data: users });
});

router.post('/users', apiAdmin, async (req, res) => {
  try {
    const { name, username, password, role, daily_target, email } = req.body;
    if (!name || !username || !password) return res.json({ ok: false, error: 'All fields required' });
    if (await User.findOne({ where: { username } })) return res.json({ ok: false, error: 'Username taken' });
    const colors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#a78bfa','#fb923c','#3b82f6'];
    const avatar_color = colors[Math.floor(Math.random()*colors.length)];
    const user = await User.create({ name, username, password: await bcrypt.hash(password, 10), role: role||'staff', daily_target: daily_target||50, email, avatar_color });
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

// ── GLOBAL SEARCH ─────────────────────────────────────────────────
router.get('/search', apiAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ ok: true, results: [] });
    const like = { [Op.like]: `%${q}%` };
    const [leads, clients, invoices] = await Promise.all([
      Lead.findAll({ where: { [Op.or]: [{ name: like }, { phone: like }] }, limit: 5, attributes: ['id','name','phone','status','category'] }),
      Client.findAll({ where: { [Op.or]: [{ name: like }, { phone: like }, { company: like }] }, limit: 5, attributes: ['id','name','company','phone','pipeline_stage'] }),
      Invoice.findAll({ where: { invoice_no: like }, limit: 3, attributes: ['id','invoice_no','total','status'], include: [{ model: Client, attributes: ['name'] }] }),
    ]);
    const results = [
      ...leads.map(l => ({ type:'lead', id:l.id, title:l.name, sub:l.phone+' · '+l.status, tab:'all_leads' })),
      ...clients.map(c => ({ type:'client', id:c.id, title:c.name+(c.company?' — '+c.company:''), sub:c.phone+' · '+c.pipeline_stage, tab:'clients' })),
      ...invoices.map(i => ({ type:'invoice', id:i.id, title:i.invoice_no, sub:(i.Client?.name||'')+ ' · ₹'+i.total, tab:'invoices' })),
    ];
    res.json({ ok: true, results });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── EXPORT ────────────────────────────────────────────────────────
router.get('/export/leads', apiAdmin, async (req, res) => {
  try {
    const leads = await Lead.findAll({ include: [{ model: User, as: 'assignedStaff', attributes: ['name'], required: false }] });
    const data = leads.map(l => ({
      ID: l.id, Name: l.name, Phone: l.phone, Email: l.email||'',
      City: l.city||'', State: l.state||'', Category: l.category||'',
      Status: l.status, Source: l.source||'', 'Assigned To': l.assignedStaff?.name||'Unassigned',
      'Lead Score': l.lead_score||0, 'Call Count': l.call_count||0,
      'Callback Date': l.callback_date||'', Notes: l.last_note||'',
      'Created At': new Date(l.createdAt).toLocaleDateString('en-IN')
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Leads');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/export/clients', apiAdmin, async (req, res) => {
  try {
    const clients = await Client.findAll({ include: [{ model: User, as: 'assignedStaff', attributes: ['name'], required: false }] });
    const data = clients.map(c => ({
      ID: c.id, Name: c.name, Company: c.company||'', Phone: c.phone||'', Email: c.email||'',
      City: c.city||'', State: c.state||'', GSTIN: c.gstin||'', Category: c.category||'',
      'Pipeline Stage': c.pipeline_stage, 'Project Value': c.project_value||0,
      'Total Received': c.total_received||0, 'Assigned To': c.assignedStaff?.name||'',
      Priority: c.priority||'medium', 'Next Followup': c.next_followup||'',
      'Created At': new Date(c.createdAt).toLocaleDateString('en-IN')
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Clients');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=clients-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/export/revenue', apiAdmin, async (req, res) => {
  try {
    const invoices = await Invoice.findAll({ where: { status: 'paid' }, include: [{ model: Client, attributes: ['name','company','state'] }], order: [['paid_at','DESC']] });
    const data = invoices.map(i => ({
      'Invoice No': i.invoice_no, Client: i.Client?.name||'', Company: i.Client?.company||'',
      'State': i.Client?.state||'', Subtotal: i.subtotal, 'GST Type': i.gst_type,
      'CGST': i.cgst_amount||0, 'SGST': i.sgst_amount||0, 'IGST': i.igst_amount||0,
      Total: i.total, 'Paid At': i.paid_at ? new Date(i.paid_at).toLocaleDateString('en-IN') : ''
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Revenue');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=revenue-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── DASHBOARD ─────────────────────────────────────────────────────
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
      Proposal.count(),
      Proposal.count({ where: { status: 'accepted' } }),
      Invoice.count(),
      Invoice.count({ where: { status: 'paid' } }),
    ]);

    const staffUsers = await User.findAll({ where: { active: true, role: 'staff' }, attributes: ['id','name','daily_target','avatar_color'] });
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
      const revenue = await Client.sum('total_received', { where: { assigned_to: u.id } }) || 0;
      const score = Math.round(parseFloat(convRate)*0.4 + interested*10 + monthCallsStaff*0.1);
      return { id: u.id, name: u.name, avatar_color: u.avatar_color, daily_target: u.daily_target||50, total, pending, called, interested, not_interested, callback, todayCalls: todayCallsStaff, monthCalls: monthCallsStaff, convRate, completion, revenue, score };
    }));

    // Sort by score for leaderboard
    staffStats.sort((a,b) => b.score - a.score);

    const pipelineByStage = await Client.findAll({ attributes: ['pipeline_stage', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt'], [sequelize.fn('SUM', sequelize.col('project_value')), 'val']], group: ['pipeline_stage'] });
    const recentActivities = await ClientActivity.findAll({ include: [{ model: User, as: 'user', attributes: ['name'], required: false }, { model: Client, attributes: ['name'], required: false }], order: [['date','DESC']], limit: 10 });
    const overduefollowups = await Client.findAll({ where: { next_followup: { [Op.lte]: now }, pipeline_stage: { [Op.notIn]: ['completed','lost'] } }, include: [{ model: User, as: 'assignedStaff', attributes: ['name'], required: false }], limit: 10 });
    const hotLeads = await Lead.findAll({ where: { status: { [Op.in]: ['callback','interested'] }, assigned_to: { [Op.ne]: null } }, order: [['lead_score','DESC']], limit: 5, include: [{ model: User, as: 'assignedStaff', attributes: ['name'], required: false }] });

    res.json({
      ok: true, totalLeads, unassigned, assigned: totalLeads-unassigned, todayLeads,
      totalClients, activeClients, totalRevenue: totalRevenue||0, monthRevenue: monthRevenue||0,
      pendingInvValue: pendingInvValue||0, pendingInvCount, totalCalls, todayCalls, weekCalls,
      pendingTasks, overdueTasks, totalProposals, acceptedProposals, totalInvoices, paidInvoices,
      staffStats, pipelineByStage, recentActivities, overduefollowups, hotLeads
    });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── LEADS ─────────────────────────────────────────────────────────
router.get('/leads', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { status, assigned, search, category, source, page=1, limit=50, sort='id', order='ASC' } = req.query;
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
    const validSort = ['id','name','lead_score','call_count','createdAt'].includes(sort) ? sort : 'id';
    const validOrder = ['ASC','DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';
    const { count, rows } = await Lead.findAndCountAll({ where, limit: parseInt(limit), offset, order: [[validSort, validOrder]], include: [{ model: User, as: 'assignedStaff', attributes: ['name','avatar_color'], required: false }] });
    res.json({ ok: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count/parseInt(limit)) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/next', apiAuth, async (req, res) => {
  try {
    const where = { assigned_to: parseInt(req.session.user.id), status: 'pending' };
    if (req.query.after_id) where.id = { [Op.gt]: parseInt(req.query.after_id) };
    const lead = await Lead.findOne({ where, order: [['lead_score','DESC'],['id','ASC']] });
    res.json({ ok: true, data: lead });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/stats', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role==='staff' ? { assigned_to: parseInt(user.id) } : {};
    const total = await Lead.count({ where });
    const byStatus = await Lead.findAll({ where, attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['status'] });
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sw = user.role==='staff' ? { staff_id: parseInt(user.id) } : {};
    const todayCalls = await CallLog.count({ where: { ...sw, call_date: { [Op.gte]: today } } });
    const monthCalls = await CallLog.count({ where: { ...sw, call_date: { [Op.gte]: monthStart } } });
    const hotLeadsCount = await Lead.count({ where: { ...where, lead_score: { [Op.gte]: 60 } } });
    res.json({ ok: true, total, byStatus, todayCalls, monthCalls, hotLeadsCount });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/callbacks-due', apiAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const where = { status: 'callback', callback_date: { [Op.lte]: today } };
    if (req.session.user.role === 'staff') where.assigned_to = parseInt(req.session.user.id);
    const leads = await Lead.findAll({ where, limit: 20, order: [['callback_date','ASC']] });
    res.json({ ok: true, data: leads, count: leads.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/leads', apiAuth, async (req, res) => {
  try {
    const lead = await Lead.create({ ...req.body });
    const score = calculateLeadScore(lead);
    await lead.update({ lead_score: score });
    res.json({ ok: true, data: lead });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/leads/:id', apiAuth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.json({ ok: false, error: 'Not found' });
    await lead.update(req.body);
    const score = calculateLeadScore(lead);
    await lead.update({ lead_score: score });
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
    // Send WA notification to staff
    try {
      const staff = await User.findByPk(parseInt(staff_id), { attributes: ['name','whatsapp'] });
      if(staff?.whatsapp) {
        const msg = `🎯 *Macto AI CRM Alert*

Hi ${staff.name}! 📋 *${lead_ids.length} new lead(s)* have been assigned to you.

Please login to your CRM and start calling.

🚀 *Macto AI CRM*`;
        await sendWANotification(staff.whatsapp, msg);
      }
    } catch(e) { console.error('WA assign notify error:', e.message); }
    res.json({ ok: true, count: lead_ids.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/leads/bulk', apiAdmin, async (req, res) => {
  try {
    const { lead_ids, filter_assigned, filter_source, filter_date } = req.body;
    let where = {};
    if (lead_ids?.length) {
      where.id = { [Op.in]: lead_ids };
    } else if (filter_assigned === 'unassigned') {
      where.assigned_to = null;
      if (filter_source) where.source = filter_source;
      if (filter_date) where[Op.and] = [sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), filter_date)];
    } else if (filter_source) {
      where.source = filter_source;
      if (filter_date) where[Op.and] = [sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), filter_date)];
    } else if (filter_date) {
      where[Op.and] = [sequelize.where(sequelize.fn('DATE', sequelize.col('createdAt')), filter_date)];
    }
    // Allow empty where to delete all if explicitly requested
    if (!Object.keys(where).length) {
      // Delete all leads - no filter needed
    }
    const count = await Lead.destroy({ where });
    res.json({ ok: true, count });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/leads/:id/log', apiAuth, async (req, res) => {
  try {
    const { status, note, callback_date, not_converted_reason, duration_sec } = req.body;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.json({ ok: false, error: 'Not found' });
    const upd = { status, call_count: (lead.call_count||0)+1, last_called_at: new Date() };
    if (note) upd.last_note = note;
    if (callback_date) upd.callback_date = callback_date;
    else if (status !== 'callback') upd.callback_date = null;
    if (not_converted_reason) upd.not_converted_reason = not_converted_reason;
    await lead.update(upd);
    const score = calculateLeadScore({ ...lead.toJSON(), ...upd });
    await lead.update({ lead_score: score });
    await CallLog.create({ lead_id: lead.id, staff_id: parseInt(req.session.user.id), status, note, duration_sec: duration_sec||0 });
    let newClient = null;
    if (status === 'interested') {
      newClient = await Client.create({ name: lead.name, phone: lead.phone, email: lead.email, city: lead.city, state: lead.state, category: lead.category, source: lead.source, lead_id: lead.id, assigned_to: lead.assigned_to, pipeline_stage: 'interested' });
      await ClientActivity.create({ client_id: newClient.id, user_id: parseInt(req.session.user.id), type: 'stage_change', title: 'Lead converted to client', description: note||'' });
    }
    const nextLead = await Lead.findOne({ where: { assigned_to: parseInt(req.session.user.id), status: 'pending', id: { [Op.gt]: lead.id } }, order: [['lead_score','DESC'],['id','ASC']] });
    res.json({ ok: true, nextLead, newClient });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/leads/:id/logs', apiAuth, async (req, res) => {
  const logs = await CallLog.findAll({ where: { lead_id: req.params.id }, include: [{ model: User, as: 'staff', attributes: ['name'], required: false }], order: [['call_date','DESC']] });
  res.json({ ok: true, data: logs });
});

router.get('/leads/batches', apiAdmin, async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        DATE(createdAt) as date,
        source,
        COUNT(id) as count,
        SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned
      FROM leads
      GROUP BY DATE(createdAt), source
      ORDER BY DATE(createdAt) DESC
    `);
    const data = results.map(r => ({
      date: r.date ? String(r.date).slice(0,10) : '',
      source: r.source || 'import',
      count: parseInt(r.count || 0),
      unassigned: parseInt(r.unassigned || 0)
    }));
    res.json({ ok: true, data });
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
    const leads = rows.map(row => {
      const lead = { name: map.name ? String(row[map.name]||'').trim() : '', phone: map.phone ? String(row[map.phone]||'').trim() : '', email: map.email ? String(row[map.email]||'').trim() : '', city: map.city ? String(row[map.city]||'').trim() : '', state: map.state ? String(row[map.state]||'').trim() : '', source: source||'import', category: category||'other', status: 'pending' };
      lead.lead_score = calculateLeadScore(lead);
      return lead;
    });
    await Lead.bulkCreate(leads, { ignoreDuplicates: true });
    res.json({ ok: true, count: leads.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── TEAM ASSIGNMENT STATS ────────────────────────────────────────────
router.get('/team/assignment-stats', apiAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
    const week = new Date(today); week.setDate(week.getDate()-7);
    const month = new Date(today); month.setDate(month.getDate()-30);

    const staffUsers = await User.findAll({ where: { active: true, role: 'staff' }, attributes: ['id','name','username','avatar_color','daily_target'] });

    const stats = await Promise.all(staffUsers.map(async u => {
      const [total, pending, called, interested, todayAssigned, yesterdayAssigned, weekAssigned, monthAssigned, todayCalls] = await Promise.all([
        Lead.count({ where: { assigned_to: u.id } }),
        Lead.count({ where: { assigned_to: u.id, status: 'pending' } }),
        Lead.count({ where: { assigned_to: u.id, status: 'called' } }),
        Lead.count({ where: { assigned_to: u.id, status: 'interested' } }),
        Lead.count({ where: { assigned_to: u.id, updatedAt: { [Op.gte]: today } } }),
        Lead.count({ where: { assigned_to: u.id, updatedAt: { [Op.gte]: yesterday, [Op.lt]: today } } }),
        Lead.count({ where: { assigned_to: u.id, updatedAt: { [Op.gte]: week } } }),
        Lead.count({ where: { assigned_to: u.id, updatedAt: { [Op.gte]: month } } }),
        CallLog.count({ where: { staff_id: u.id, call_date: { [Op.gte]: today } } }),
      ]);
      const convRate = total > 0 ? ((interested/total)*100).toFixed(1) : '0.0';
      return { id: u.id, name: u.name, username: u.username, avatar_color: u.avatar_color, daily_target: u.daily_target||50, total, pending, called, interested, todayAssigned, yesterdayAssigned, weekAssigned, monthAssigned, todayCalls, convRate };
    }));

    res.json({ ok: true, data: stats });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── CLIENTS ───────────────────────────────────────────────────────
router.get('/clients', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const { stage, category, search, assigned, priority, page=1, limit=200 } = req.query;
    const where = {};
    if (user.role==='staff') where[Op.or] = [{ assigned_to: parseInt(user.id) }, { managed_by: parseInt(user.id) }];
    if (stage && stage!=='all') where.pipeline_stage = stage;
    if (category && category!=='all') where.category = category;
    if (priority && priority!=='all') where.priority = priority;
    if (assigned && assigned!=='all' && user.role==='admin') where.assigned_to = parseInt(assigned);
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { company: { [Op.like]: `%${search}%` } }, { phone: { [Op.like]: `%${search}%` } }];
    const offset = (parseInt(page)-1)*parseInt(limit);
    const { count, rows } = await Client.findAndCountAll({ where, limit: parseInt(limit), offset, include: [{ model: User, as: 'assignedStaff', attributes: ['name','avatar_color'], required: false }], order: [['next_followup','ASC'],['createdAt','DESC']] });
    res.json({ ok: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count/parseInt(limit)) });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/clients', apiAuth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.assigned_to) body.assigned_to = parseInt(req.session.user.id);
    const client = await Client.create(body);
    await ClientActivity.create({ client_id: client.id, user_id: parseInt(req.session.user.id), type: 'note', title: 'Client added manually' });
    res.json({ ok: true, data: client });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/clients/:id', apiAuth, async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id, { include: [{ model: User, as: 'assignedStaff', attributes: ['id','name','avatar_color'], required: false }] });
    if (!client) return res.json({ ok: false, error: 'Not found' });
    const [activities, tasks, invoices, proposals] = await Promise.all([
      ClientActivity.findAll({ where: { client_id: client.id }, include: [{ model: User, as: 'user', attributes: ['name'], required: false }], order: [['date','DESC']] }),
      Task.findAll({ where: { client_id: client.id }, include: [{ model: User, as: 'assignedTo', attributes: ['name'], required: false }] }),
      Invoice.findAll({ where: { client_id: client.id }, order: [['createdAt','DESC']] }),
      Proposal.findAll({ where: { client_id: client.id }, order: [['createdAt','DESC']] }),
    ]);
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
    const tasks = await Task.findAll({ where, order: [['due_date','ASC'],['priority','DESC'],['createdAt','DESC']], include: [{ model: User, as: 'assignedTo', attributes: ['name','avatar_color'], required: false }, { model: Client, attributes: ['name'], required: false }] });
    res.json({ ok: true, data: tasks });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/tasks', apiAuth, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, created_by: parseInt(req.session.user.id) });
    if (task.assigned_to !== parseInt(req.session.user.id)) {
      await Notification.create({ user_id: task.assigned_to, title: '✅ New Task: '+task.title, message: `Due: ${task.due_date||'No deadline'}`, type: 'task' });
      // Send WA notification
      try {
        const staff = await User.findByPk(task.assigned_to, { attributes: ['name','whatsapp'] });
        if(staff?.whatsapp) {
          const msg = `✅ *Macto AI CRM — New Task*

Hi ${staff.name}!

📋 *Task:* ${task.title}
📅 *Due:* ${task.due_date||'No deadline'}
⚡ *Priority:* ${task.priority?.toUpperCase()||'MEDIUM'}

Please check your CRM dashboard.

🚀 *Macto AI CRM*`;
          await sendWANotification(staff.whatsapp, msg);
        }
      } catch(e) { console.error('WA task notify error:', e.message); }
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
    if (req.query.status && req.query.status!=='all') where.status = req.query.status;
    const { from, to } = req.query;
    if (from) where.createdAt = { ...(where.createdAt||{}), [Op.gte]: new Date(from) };
    if (to) where.createdAt = { ...(where.createdAt||{}), [Op.lte]: new Date(to+'T23:59:59') };
    const invoices = await Invoice.findAll({ where, order: [['createdAt','DESC']], include: [{ model: Client, attributes: ['id','name','phone','email','company','state'] }] });
    res.json({ ok: true, data: invoices });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/invoices', apiAuth, async (req, res) => {
  try {
    const { client_id, items, gst_percent, due_date, notes } = req.body;
    const subtotal = (items||[]).reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
    const client = await Client.findByPk(client_id);
    const gstInfo = calculateGST(subtotal, parseFloat(gst_percent)||18, client?.state, process.env.COMPANY_STATE||'Kerala');
    const count = await Invoice.count();
    const invoice_no = `MACTO-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
    const invoice = await Invoice.create({
      invoice_no, client_id, created_by: parseInt(req.session.user.id), items,
      subtotal, gst_percent: parseFloat(gst_percent)||18,
      gst_amount: gstInfo.total, cgst_amount: gstInfo.cgst, sgst_amount: gstInfo.sgst, igst_amount: gstInfo.igst,
      gst_type: gstInfo.type, total: subtotal+gstInfo.total, due_date, notes
    });
    await Client.update({ pipeline_stage: 'invoice_shared' }, { where: { id: client_id } });
    await ClientActivity.create({ client_id, user_id: parseInt(req.session.user.id), type: 'invoice', title: `Invoice ${invoice_no} created`, amount: subtotal+gstInfo.total });
    res.json({ ok: true, data: invoice });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/invoices/:id', apiAuth, async (req, res) => {
  try {
    const inv = await Invoice.findByPk(req.params.id, { include: [{ model: Client, attributes: ['id','name','phone','email','company','city','state','gstin'] }] });
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
      await ClientActivity.create({ client_id: inv.client_id, user_id: parseInt(req.session.user.id), type: 'payment', title: `Invoice ${inv.invoice_no} marked paid`, amount: inv.total });
      // Send WA notification to staff who created invoice
      try {
        const client = await Client.findByPk(inv.client_id, { attributes: ['name'] });
        const creator = await User.findByPk(inv.created_by, { attributes: ['name','whatsapp'] });
        if(creator?.whatsapp) {
          const msg = `💰 *Macto AI CRM — Payment Received!*

Hi ${creator.name}! 🎉

✅ *Invoice:* ${inv.invoice_no}
👤 *Client:* ${client?.name||'—'}
💵 *Amount:* ₹${Number(inv.total).toLocaleString('en-IN')}

Payment has been marked as received!

🚀 *Macto AI CRM*`;
          await sendWANotification(creator.whatsapp, msg);
        }
      } catch(e) { console.error('WA invoice notify error:', e.message); }
    }
    await inv.update(req.body);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── PROPOSALS ─────────────────────────────────────────────────────
router.get('/proposals', apiAuth, async (req, res) => {
  try {
    const user = req.session.user;
    const where = user.role==='staff' ? { created_by: parseInt(user.id) } : {};
    const proposals = await Proposal.findAll({ where, order: [['createdAt','DESC']], include: [{ model: Client, attributes: ['id','name','phone','email','company'] }] });
    res.json({ ok: true, data: proposals });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/proposals', apiAuth, async (req, res) => {
  try {
    const count = await Proposal.count();
    const proposal_no = `MPROP-${new Date().getFullYear()}-${String(count+1).padStart(4,'0')}`;
    const proposal = await Proposal.create({ ...req.body, proposal_no, created_by: parseInt(req.session.user.id) });
    if (req.body.client_id) {
      await Client.update({ pipeline_stage: 'proposal_shared' }, { where: { id: req.body.client_id } });
      await ClientActivity.create({ client_id: req.body.client_id, user_id: parseInt(req.session.user.id), type: 'proposal', title: `Proposal ${proposal_no} created`, amount: req.body.investment||0 });
    }
    res.json({ ok: true, data: proposal });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.get('/proposals/:id', apiAuth, async (req, res) => {
  try {
    const proposal = await Proposal.findByPk(req.params.id, { include: [{ model: Client, attributes: ['id','name','phone','email','company','city','state','gstin','website'] }] });
    if (!proposal) return res.json({ ok: false, error: 'Not found' });
    res.json({ ok: true, data: proposal });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.put('/proposals/:id', apiAuth, async (req, res) => {
  try {
    const proposal = await Proposal.findByPk(req.params.id);
    if (!proposal) return res.json({ ok: false, error: 'Not found' });
    if (req.body.status==='accepted') { req.body.accepted_at = new Date(); if (proposal.client_id) await Client.update({ pipeline_stage: 'converted' }, { where: { id: proposal.client_id } }); }
    await proposal.update(req.body);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/proposals/:id', apiAuth, async (req, res) => {
  await Proposal.destroy({ where: { id: req.params.id } });
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
    if (req.body.status==='converted' && !audit.client_id) {
      const client = await Client.create({ name: audit.company_name, phone: audit.phone, email: audit.email, website: audit.website_url, category: audit.category, source: 'audit', assigned_to: audit.auditor_id, pipeline_stage: 'interested' });
      await audit.update({ client_id: client.id });
    }
    res.json({ ok: true });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.delete('/audits/:id', apiAdminOrAuditor, async (req, res) => {
  await Audit.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── ANALYTICS ─────────────────────────────────────────────────────
router.get('/analytics/full', apiAdmin, async (req, res) => {
  try {
    const now = new Date();
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter[Op.gte] = new Date(from);
    if (to)   dateFilter[Op.lte] = new Date(to+'T23:59:59');

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    // Source conversion
    const sourceData = await Lead.findAll({ attributes: ['source', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']], group: ['source','status'] });
    const bySource = {};
    sourceData.forEach(r => {
      if (!bySource[r.source]) bySource[r.source] = { total:0, interested:0, not_interested:0 };
      bySource[r.source].total += parseInt(r.cnt);
      if (r.status==='interested') bySource[r.source].interested += parseInt(r.cnt);
      if (r.status==='not_interested') bySource[r.source].not_interested += parseInt(r.cnt);
    });
    Object.keys(bySource).forEach(s => { bySource[s].rate = bySource[s].total ? ((bySource[s].interested/bySource[s].total)*100).toFixed(1) : 0; });

    // Staff performance
    const staffUsers = await User.findAll({ where: { active: true }, attributes: ['id','name','role','avatar_color'] });
    const staffPerf = await Promise.all(staffUsers.map(async u => {
      const [totalCalls, monthCalls, lastMonthCalls, totalLeads, interested, converted, revenue] = await Promise.all([
        CallLog.count({ where: { staff_id: u.id } }),
        CallLog.count({ where: { staff_id: u.id, call_date: { [Op.gte]: monthStart } } }),
        CallLog.count({ where: { staff_id: u.id, call_date: { [Op.between]: [lastMonthStart, lastMonthEnd] } } }),
        Lead.count({ where: { assigned_to: u.id } }),
        Lead.count({ where: { assigned_to: u.id, status: 'interested' } }),
        Client.count({ where: { assigned_to: u.id, pipeline_stage: { [Op.in]: ['converted','work_started','in_progress','deployed','completed'] } } }),
        Client.sum('total_received', { where: { assigned_to: u.id } }) || 0,
      ]);
      const convRate = totalLeads > 0 ? ((interested/totalLeads)*100).toFixed(1) : 0;
      const trend = lastMonthCalls > 0 ? Math.round(((monthCalls-lastMonthCalls)/lastMonthCalls)*100) : 0;
      const score = Math.round(parseFloat(convRate)*0.4 + converted*10 + monthCalls*0.01);
      return { id: u.id, name: u.name, role: u.role, avatar_color: u.avatar_color, totalCalls, monthCalls, lastMonthCalls, trend, totalLeads, interested, converted, revenue: revenue||0, convRate, score };
    }));
    staffPerf.sort((a,b) => b.score - a.score);

    // Monthly revenue (6 months)
    const monthlyRevenue = [];
    for (let i=5; i>=0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const end = new Date(now.getFullYear(), now.getMonth()-i+1, 1);
      const rev = await Invoice.sum('total', { where: { status: 'paid', createdAt: { [Op.gte]: start, [Op.lt]: end } } }) || 0;
      const calls = await CallLog.count({ where: { call_date: { [Op.gte]: start, [Op.lt]: end } } });
      monthlyRevenue.push({ month: start.toLocaleString('en-IN',{month:'short',year:'2-digit'}), revenue: rev, calls });
    }

    // Category breakdown
    const catData = await Client.findAll({ attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt'], [sequelize.fn('SUM', sequelize.col('total_received')), 'rev']], group: ['category'] });

    const reasons = await Lead.findAll({ where: { status: 'not_interested', not_converted_reason: { [Op.ne]: null, [Op.ne]: '' } }, attributes: ['not_converted_reason'], limit: 20 });
    const pipelineValue = await Client.sum('project_value', { where: { pipeline_stage: { [Op.notIn]: ['completed','lost'] } } }) || 0;
    const totalRevenue = await Client.sum('total_received') || 0;

    res.json({ ok: true, bySource, staffPerf, monthlyRevenue, catData, reasons: reasons.map(r=>r.not_converted_reason), pipelineValue, totalRevenue });
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

// ── BULK WHATSAPP ─────────────────────────────────────────────────
router.get('/wa-campaigns', apiAdmin, async (req, res) => {
  try {
    const campaigns = await WACampaign.findAll({ order: [['createdAt','DESC']], include: [{ model: User, as: 'createdBy', attributes: ['name'], required: false }] });
    res.json({ ok: true, data: campaigns });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/wa-campaigns/preview', apiAdmin, async (req, res) => {
  try {
    const { filter_status, filter_category, filter_source } = req.body;
    const where = { phone: { [Op.ne]: null, [Op.ne]: '' } };
    if (filter_status && filter_status !== 'all') where.status = filter_status;
    if (filter_category && filter_category !== 'all') where.category = filter_category;
    if (filter_source && filter_source !== 'all') where.source = filter_source;
    const count = await Lead.count({ where });
    const sample = await Lead.findAll({ where, limit: 5, attributes: ['name','phone'] });
    res.json({ ok: true, count, sample });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/wa-campaigns', apiAdmin, async (req, res) => {
  try {
    const { name, message, filter_status, filter_category, filter_source } = req.body;
    const where = { phone: { [Op.ne]: null, [Op.ne]: '' } };
    if (filter_status && filter_status !== 'all') where.status = filter_status;
    if (filter_category && filter_category !== 'all') where.category = filter_category;
    if (filter_source && filter_source !== 'all') where.source = filter_source;
    const total = await Lead.count({ where });
    const campaign = await WACampaign.create({ name, message, filter_status, filter_category, filter_source, created_by: parseInt(req.session.user.id), total_count: total, status: 'draft' });
    res.json({ ok: true, data: campaign, total });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

router.post('/wa-campaigns/:id/send', apiAdmin, async (req, res) => {
  try {
    const campaign = await WACampaign.findByPk(req.params.id);
    if (!campaign) return res.json({ ok: false, error: 'Not found' });
    const TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    if (!TOKEN || !PHONE_ID) return res.json({ ok: false, error: 'WhatsApp not configured' });
    const where = { phone: { [Op.ne]: null, [Op.ne]: '' } };
    if (campaign.filter_status && campaign.filter_status !== 'all') where.status = campaign.filter_status;
    if (campaign.filter_category && campaign.filter_category !== 'all') where.category = campaign.filter_category;
    if (campaign.filter_source && campaign.filter_source !== 'all') where.source = campaign.filter_source;
    const leads = await Lead.findAll({ where, attributes: ['id','name','phone'] });
    await campaign.update({ status: 'running', started_at: new Date() });
    let sent = 0, failed = 0;
    for (const lead of leads) {
      try {
        const msg = campaign.message.replace(/\{name\}/gi, lead.name||'');
        const phone = lead.phone.replace(/[^0-9]/g,'');
        const r = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, { method:'POST', headers:{'Authorization':`Bearer ${TOKEN}`,'Content-Type':'application/json'}, body: JSON.stringify({ messaging_product:'whatsapp', to: phone, type:'text', text:{ body: msg } }) });
        const data = await r.json();
        if (data.messages) sent++; else failed++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch { failed++; }
    }
    await campaign.update({ status: 'completed', sent_count: sent, failed_count: failed, completed_at: new Date() });
    res.json({ ok: true, sent, failed, total: leads.length });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── WHATSAPP SINGLE ───────────────────────────────────────────────
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
      if (client_id) await ClientActivity.create({ client_id: parseInt(client_id), user_id: parseInt(req.session.user.id), type: 'whatsapp', title: doc_type ? `WhatsApp: ${doc_type} ${doc_no}` : 'WhatsApp message sent', description: message.slice(0,200) });
      res.json({ ok: true });
    } else res.json({ ok: false, error: data.error?.message||'Send failed' });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

// ── WORK SCHEDULE ────────────────────────────────────────────────────
router.get('/work/schedule/:user_id', apiAdmin, async (req, res) => {
  try {
    let schedule = await WorkSchedule.findOne({ where: { user_id: req.params.user_id } });
    if(!schedule) {
      schedule = await WorkSchedule.create({ user_id: req.params.user_id });
    }
    res.json({ ok: true, data: schedule });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

router.post('/work/schedule/:user_id', apiAdmin, async (req, res) => {
  try {
    let schedule = await WorkSchedule.findOne({ where: { user_id: req.params.user_id } });
    if(schedule) {
      await schedule.update(req.body);
    } else {
      schedule = await WorkSchedule.create({ user_id: req.params.user_id, ...req.body });
    }
    res.json({ ok: true, data: schedule });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

router.get('/work/schedules', apiAdmin, async (req, res) => {
  try {
    const schedules = await WorkSchedule.findAll({
      include: [{ model: User, attributes: ['id','name','username','role','avatar_color'], required: false }]
    });
    res.json({ ok: true, data: schedules });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

// ── WORK LOGS ─────────────────────────────────────────────────────────
router.post('/work/login', apiAuth, async (req, res) => {
  try {
    const userId = parseInt(req.session.user.id);
    const today = new Date().toISOString().slice(0,10);
    
    // Check if already logged in today
    let log = await WorkLog.findOne({ where: { user_id: userId, date: today } });
    if(log && log.login_at) {
      return res.json({ ok: false, error: 'Already logged in today', data: log });
    }
    
    const now = new Date();
    const schedule = await WorkSchedule.findOne({ where: { user_id: userId } });
    
    // Determine if late
    let status = 'present';
    if(schedule) {
      const [schedHour, schedMin] = schedule.work_start.split(':').map(Number);
      const schedTime = schedHour * 60 + schedMin;
      const nowTime = now.getHours() * 60 + now.getMinutes();
      if(nowTime > schedTime + 15) status = 'late';
    }
    
    if(log) {
      await log.update({ login_at: now, status });
    } else {
      log = await WorkLog.create({ user_id: userId, date: today, login_at: now, status });
    }
    
    res.json({ ok: true, data: log, status });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

router.post('/work/logout', apiAuth, async (req, res) => {
  try {
    const userId = parseInt(req.session.user.id);
    const today = new Date().toISOString().slice(0,10);
    const log = await WorkLog.findOne({ where: { user_id: userId, date: today } });
    
    if(!log || !log.login_at) {
      return res.json({ ok: false, error: 'No login record found for today' });
    }
    if(log.logout_at) {
      return res.json({ ok: false, error: 'Already logged out today' });
    }
    
    const now = new Date();
    const duration = Math.round((now - new Date(log.login_at)) / (1000 * 60));
    await log.update({ logout_at: now, duration_mins: duration });
    
    const hours = Math.floor(duration/60);
    const mins = duration%60;
    res.json({ ok: true, duration_mins: duration, duration_str: hours+'h '+mins+'m', data: log });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

router.get('/work/today', apiAuth, async (req, res) => {
  try {
    const userId = parseInt(req.session.user.id);
    const today = new Date().toISOString().slice(0,10);
    const log = await WorkLog.findOne({ where: { user_id: userId, date: today } });
    const schedule = await WorkSchedule.findOne({ where: { user_id: userId } });
    res.json({ ok: true, log, schedule });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

router.get('/work/logs', apiAdmin, async (req, res) => {
  try {
    const { from, to, user_id } = req.query;
    const where = {};
    if(user_id) where.user_id = parseInt(user_id);
    if(from) where.date = { [Op.gte]: from };
    if(to) where.date = { ...(where.date||{}), [Op.lte]: to };
    const logs = await WorkLog.findAll({
      where,
      include: [{ model: User, attributes: ['id','name','username','avatar_color'], required: false }],
      order: [['date','DESC']]
    });
    res.json({ ok: true, data: logs });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

router.get('/work/my-logs', apiAuth, async (req, res) => {
  try {
    const userId = parseInt(req.session.user.id);
    const logs = await WorkLog.findAll({
      where: { user_id: userId },
      order: [['date','DESC']],
      limit: 30
    });
    res.json({ ok: true, data: logs });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

// Followup notifications for staff
router.get('/work/followup-alerts', apiAuth, async (req, res) => {
  try {
    const userId = parseInt(req.session.user.id);
    const now = new Date();
    const today = now.toISOString().slice(0,10);
    const in30 = new Date(now.getTime() + 30*60*1000);
    const in30Str = in30.toISOString().slice(0,10);
    
    // Overdue callbacks
    const overdueCallbacks = await Lead.count({
      where: { assigned_to: userId, status: 'callback', callback_date: { [Op.lt]: today } }
    });
    
    // Today callbacks
    const todayCallbacks = await Lead.count({
      where: { assigned_to: userId, status: 'callback', callback_date: today }
    });
    
    // Overdue client followups
    const overdueFollowups = await Client.count({
      where: { 
        [Op.or]: [{ assigned_to: userId }, { managed_by: userId }],
        next_followup: { [Op.lt]: today },
        pipeline_stage: { [Op.notIn]: ['completed','lost'] }
      }
    });
    
    // Today client followups
    const todayFollowups = await Client.count({
      where: {
        [Op.or]: [{ assigned_to: userId }, { managed_by: userId }],
        next_followup: today,
        pipeline_stage: { [Op.notIn]: ['completed','lost'] }
      }
    });

    const total = overdueCallbacks + todayCallbacks + overdueFollowups + todayFollowups;
    
    res.json({ ok: true, overdueCallbacks, todayCallbacks, overdueFollowups, todayFollowups, total });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

// ── SEND CALLBACK REMINDERS ──────────────────────────────────────
router.post('/notifications/send-reminders', apiAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    // Get all callback leads due today
    const callbackLeads = await Lead.findAll({
      where: { status: 'callback', callback_date: today, assigned_to: { [Op.ne]: null } },
      include: [{ model: User, as: 'assignedStaff', attributes: ['name','whatsapp'], required: false }]
    });

    // Get all client followups due today
    const clientFollowups = await Client.findAll({
      where: { next_followup: today, pipeline_stage: { [Op.notIn]: ['completed','lost'] }, assigned_to: { [Op.ne]: null } },
      include: [{ model: User, as: 'assignedStaff', attributes: ['name','whatsapp'], required: false }]
    });

    // Get tasks due today
    const tasksDue = await Task.findAll({
      where: { due_date: today, status: { [Op.in]: ['pending','in_progress'] } },
      include: [{ model: User, as: 'assignedTo', attributes: ['name','whatsapp'], required: false }]
    });

    let sent = 0;
    const staffMessages = {};

    // Group callbacks by staff
    callbackLeads.forEach(l => {
      if(!l.assignedStaff?.whatsapp) return;
      const key = l.assignedStaff.whatsapp;
      if(!staffMessages[key]) staffMessages[key] = { name: l.assignedStaff.name, callbacks: [], followups: [], tasks: [] };
      staffMessages[key].callbacks.push(l.name||'Unknown');
    });

    // Group client followups by staff
    clientFollowups.forEach(c => {
      if(!c.assignedStaff?.whatsapp) return;
      const key = c.assignedStaff.whatsapp;
      if(!staffMessages[key]) staffMessages[key] = { name: c.assignedStaff.name, callbacks: [], followups: [], tasks: [] };
      staffMessages[key].followups.push(c.name+(c.company?' ('+c.company+')':''));
    });

    // Group tasks by staff
    tasksDue.forEach(t => {
      if(!t.assignedTo?.whatsapp) return;
      const key = t.assignedTo.whatsapp;
      if(!staffMessages[key]) staffMessages[key] = { name: t.assignedTo.name, callbacks: [], followups: [], tasks: [] };
      staffMessages[key].tasks.push(t.title);
    });

    // Send combined message to each staff
    for(const [phone, data] of Object.entries(staffMessages)) {
      let msg = '🔔 *Macto AI CRM — Daily Reminder*\n\nHi '+data.name+'! Here is your todays work summary:\n\n';
      if(data.callbacks.length) msg += '📞 *Callbacks Due Today ('+data.callbacks.length+'):*\n'+data.callbacks.slice(0,5).map(n=>'• '+n).join('\n')+'\n\n';
      if(data.followups.length) msg += '👥 *Client Follow-ups Due ('+data.followups.length+'):*\n'+data.followups.slice(0,5).map(n=>'• '+n).join('\n')+'\n\n';
      if(data.tasks.length) msg += '✅ *Tasks Due Today ('+data.tasks.length+'):*\n'+data.tasks.slice(0,5).map(n=>'• '+n).join('\n')+'\n\n';
      msg += 'Login to your CRM and complete these tasks!\n\n🚀 *Macto AI CRM*';
      const ok = await sendWANotification(phone, msg);
      if(ok) sent++;
    }

    res.json({ ok: true, sent, total: Object.keys(staffMessages).length, 
      message: sent > 0 ? 'Sent '+sent+' reminder(s) to staff' : 'No staff with WhatsApp numbers found. Add WhatsApp numbers in Team settings.' 
    });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

module.exports = router;
