require('dotenv').config();
const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'macto_crm',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

// ── USERS ─────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:         { type: DataTypes.STRING(100), allowNull: false },
  username:     { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password:     { type: DataTypes.STRING(255), allowNull: false },
  role:         { type: DataTypes.ENUM('admin','staff','auditor'), defaultValue: 'staff' },
  active:       { type: DataTypes.BOOLEAN, defaultValue: true },
  whatsapp:     { type: DataTypes.STRING(20), allowNull: true },
  daily_target: { type: DataTypes.INTEGER, defaultValue: 50 },
  email:        { type: DataTypes.STRING(150), allowNull: true },
  avatar_color: { type: DataTypes.STRING(20), defaultValue: '#6366f1' },
}, { tableName: 'users', timestamps: true, indexes: [] });

// ── LEADS ─────────────────────────────────────────────────────────
const Lead = sequelize.define('Lead', {
  id:                   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:                 { type: DataTypes.STRING(150) },
  phone:                { type: DataTypes.STRING(20) },
  email:                { type: DataTypes.STRING(150) },
  city:                 { type: DataTypes.STRING(100) },
  state:                { type: DataTypes.STRING(100) },
  category:             { type: DataTypes.ENUM('ecommerce','real_estate','clinic','study_abroad','ads_lead','restaurant','retail','corporate','other'), defaultValue: 'other' },
  business_type:        { type: DataTypes.STRING(150) },
  source:               { type: DataTypes.ENUM('cold_call','ads','referral','audit','manual','import'), defaultValue: 'cold_call' },
  status:               { type: DataTypes.ENUM('pending','called','interested','not_interested','callback','busy','no_answer','invalid','whatsapp_sent'), defaultValue: 'pending' },
  wa_followup_date:     { type: DataTypes.DATEONLY, allowNull: true },
  assigned_to:          { type: DataTypes.INTEGER, allowNull: true },
  callback_date:        { type: DataTypes.DATEONLY, allowNull: true },
  last_note:            { type: DataTypes.TEXT },
  not_converted_reason: { type: DataTypes.TEXT },
  lead_score:           { type: DataTypes.INTEGER, defaultValue: 0 },
  call_count:           { type: DataTypes.INTEGER, defaultValue: 0 },
  last_called_at:       { type: DataTypes.DATE, allowNull: true },
  extra:                { type: DataTypes.JSON },
}, { tableName: 'leads', timestamps: true, indexes: [] });

// ── CLIENTS ───────────────────────────────────────────────────────
const Client = sequelize.define('Client', {
  id:               { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:             { type: DataTypes.STRING(150), allowNull: false },
  company:          { type: DataTypes.STRING(200) },
  phone:            { type: DataTypes.STRING(20) },
  email:            { type: DataTypes.STRING(150) },
  city:             { type: DataTypes.STRING(100) },
  state:            { type: DataTypes.STRING(100) },
  website:          { type: DataTypes.STRING(255) },
  gstin:            { type: DataTypes.STRING(20), allowNull: true },
  category:         { type: DataTypes.ENUM('ecommerce','real_estate','clinic','study_abroad','ads_lead','restaurant','retail','corporate','other'), defaultValue: 'other' },
  source:           { type: DataTypes.ENUM('cold_call','ads','referral','audit','manual'), defaultValue: 'cold_call' },
  lead_id:          { type: DataTypes.INTEGER, allowNull: true },
  pipeline_stage:   { type: DataTypes.ENUM('interested','follow_up_1','follow_up_2','follow_up_3','meeting_scheduled','meeting_done','proposal_shared','negotiation','invoice_shared','advance_paid','converted','work_started','in_progress','deployed','completed','lost'), defaultValue: 'interested' },
  assigned_to:      { type: DataTypes.INTEGER, allowNull: true },
  managed_by:       { type: DataTypes.INTEGER, allowNull: true },
  project_value:    { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  advance_paid:     { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total_received:   { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  project_type:     { type: DataTypes.STRING(200) },
  progress_percent: { type: DataTypes.INTEGER, defaultValue: 0 },
  next_followup:    { type: DataTypes.DATEONLY, allowNull: true },
  notes:            { type: DataTypes.TEXT },
  lost_reason:      { type: DataTypes.TEXT },
  converted_at:     { type: DataTypes.DATE, allowNull: true },
  deployed_at:      { type: DataTypes.DATE, allowNull: true },
  completed_at:     { type: DataTypes.DATE, allowNull: true },
  priority:         { type: DataTypes.ENUM('low','medium','high','vip'), defaultValue: 'medium' },
  tags:             { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'clients', timestamps: true, indexes: [] });

// ── CLIENT ACTIVITY ───────────────────────────────────────────────
const ClientActivity = sequelize.define('ClientActivity', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  client_id:   { type: DataTypes.INTEGER, allowNull: false },
  user_id:     { type: DataTypes.INTEGER, allowNull: false },
  type:        { type: DataTypes.ENUM('note','call','meeting','proposal','invoice','payment','stage_change','followup','whatsapp','email'), defaultValue: 'note' },
  title:       { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  amount:      { type: DataTypes.DECIMAL(12,2), allowNull: true },
  date:        { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  next_action: { type: DataTypes.STRING(255) },
  next_date:   { type: DataTypes.DATEONLY, allowNull: true },
}, { tableName: 'client_activities', timestamps: false, indexes: [] });

// ── CALL LOGS ─────────────────────────────────────────────────────
const CallLog = sequelize.define('CallLog', {
  id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id:       { type: DataTypes.INTEGER, allowNull: false },
  staff_id:      { type: DataTypes.INTEGER, allowNull: false },
  status:        { type: DataTypes.STRING(50) },
  note:          { type: DataTypes.TEXT },
  duration_sec:  { type: DataTypes.INTEGER, defaultValue: 0 },
  call_date:     { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'call_logs', timestamps: false, indexes: [] });

// ── AUDITS ────────────────────────────────────────────────────────
const Audit = sequelize.define('Audit', {
  id:                     { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  auditor_id:             { type: DataTypes.INTEGER, allowNull: false },
  company_name:           { type: DataTypes.STRING(200), allowNull: false },
  website_url:            { type: DataTypes.STRING(255) },
  phone:                  { type: DataTypes.STRING(20) },
  email:                  { type: DataTypes.STRING(150) },
  category:               { type: DataTypes.ENUM('ecommerce','real_estate','clinic','study_abroad','restaurant','retail','corporate','other'), defaultValue: 'other' },
  current_website_rating: { type: DataTypes.INTEGER, defaultValue: 0 },
  issues_found:           { type: DataTypes.TEXT },
  opportunities:          { type: DataTypes.TEXT },
  proposal_sent:          { type: DataTypes.BOOLEAN, defaultValue: false },
  status:                 { type: DataTypes.ENUM('audited','proposal_sent','interested','not_interested','converted'), defaultValue: 'audited' },
  notes:                  { type: DataTypes.TEXT },
  client_id:              { type: DataTypes.INTEGER, allowNull: true },
  audit_date:             { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'audits', timestamps: true, indexes: [] });

// ── TASKS ─────────────────────────────────────────────────────────
const Task = sequelize.define('Task', {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title:        { type: DataTypes.STRING(255), allowNull: false },
  description:  { type: DataTypes.TEXT },
  assigned_to:  { type: DataTypes.INTEGER, allowNull: false },
  created_by:   { type: DataTypes.INTEGER, allowNull: false },
  client_id:    { type: DataTypes.INTEGER, allowNull: true },
  due_date:     { type: DataTypes.DATEONLY, allowNull: true },
  priority:     { type: DataTypes.ENUM('low','medium','high','urgent'), defaultValue: 'medium' },
  status:       { type: DataTypes.ENUM('pending','in_progress','done','cancelled'), defaultValue: 'pending' },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'tasks', timestamps: true, indexes: [] });

// ── INVOICES ──────────────────────────────────────────────────────
const Invoice = sequelize.define('Invoice', {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  invoice_no:   { type: DataTypes.STRING(50), allowNull: false, unique: true },
  client_id:    { type: DataTypes.INTEGER, allowNull: false },
  created_by:   { type: DataTypes.INTEGER, allowNull: false },
  items:        { type: DataTypes.JSON },
  subtotal:     { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  gst_percent:  { type: DataTypes.DECIMAL(5,2), defaultValue: 18 },
  gst_amount:   { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  cgst_amount:  { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  sgst_amount:  { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  igst_amount:  { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  gst_type:     { type: DataTypes.ENUM('cgst_sgst','igst'), defaultValue: 'cgst_sgst' },
  total:        { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  status:       { type: DataTypes.ENUM('draft','sent','paid','cancelled'), defaultValue: 'draft' },
  due_date:     { type: DataTypes.DATEONLY, allowNull: true },
  notes:        { type: DataTypes.TEXT },
  paid_at:      { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'invoices', timestamps: true, indexes: [] });

// ── PROPOSALS ─────────────────────────────────────────────────────
const Proposal = sequelize.define('Proposal', {
  id:                   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  proposal_no:          { type: DataTypes.STRING(50), allowNull: false, unique: true },
  client_id:            { type: DataTypes.INTEGER, allowNull: false },
  created_by:           { type: DataTypes.INTEGER, allowNull: false },
  project_title:        { type: DataTypes.STRING(255) },
  project_overview:     { type: DataTypes.TEXT },
  scope_of_work:        { type: DataTypes.JSON },
  deliverables:         { type: DataTypes.JSON },
  timeline_weeks:       { type: DataTypes.INTEGER, defaultValue: 4 },
  timeline_details:     { type: DataTypes.JSON },
  investment:           { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  investment_breakdown: { type: DataTypes.JSON },
  payment_terms:        { type: DataTypes.TEXT },
  why_us:               { type: DataTypes.TEXT },
  terms:                { type: DataTypes.TEXT },
  validity_days:        { type: DataTypes.INTEGER, defaultValue: 30 },
  status:               { type: DataTypes.ENUM('draft','sent','accepted','rejected','revised'), defaultValue: 'draft' },
  sent_at:              { type: DataTypes.DATE, allowNull: true },
  accepted_at:          { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'proposals', timestamps: true, indexes: [] });

// ── NOTIFICATIONS ─────────────────────────────────────────────────
const Notification = sequelize.define('Notification', {
  id:      { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title:   { type: DataTypes.STRING(255) },
  message: { type: DataTypes.TEXT },
  type:    { type: DataTypes.ENUM('task','client','lead','invoice','system','callback','reminder'), defaultValue: 'system' },
  read:    { type: DataTypes.BOOLEAN, defaultValue: false },
  link:    { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'notifications', timestamps: true, indexes: [] });

// ── BULK WA CAMPAIGNS ─────────────────────────────────────────────
const WACampaign = sequelize.define('WACampaign', {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:         { type: DataTypes.STRING(200), allowNull: false },
  message:      { type: DataTypes.TEXT, allowNull: false },
  filter_status:{ type: DataTypes.STRING(50), allowNull: true },
  filter_category:{ type: DataTypes.STRING(50), allowNull: true },
  filter_source:{ type: DataTypes.STRING(50), allowNull: true },
  created_by:   { type: DataTypes.INTEGER, allowNull: false },
  total_count:  { type: DataTypes.INTEGER, defaultValue: 0 },
  sent_count:   { type: DataTypes.INTEGER, defaultValue: 0 },
  failed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status:       { type: DataTypes.ENUM('draft','running','completed','failed'), defaultValue: 'draft' },
  started_at:   { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'wa_campaigns', timestamps: true, indexes: [] });

// ── ASSOCIATIONS ──────────────────────────────────────────────────
Lead.belongsTo(User, { as: 'assignedStaff', foreignKey: 'assigned_to' });
Client.belongsTo(User, { as: 'assignedStaff', foreignKey: 'assigned_to' });
Client.belongsTo(User, { as: 'managedBy', foreignKey: 'managed_by' });
Client.belongsTo(Lead, { foreignKey: 'lead_id' });
ClientActivity.belongsTo(Client, { foreignKey: 'client_id' });
ClientActivity.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
CallLog.belongsTo(Lead, { foreignKey: 'lead_id' });
CallLog.belongsTo(User, { as: 'staff', foreignKey: 'staff_id' });
Audit.belongsTo(User, { as: 'auditor', foreignKey: 'auditor_id' });
Audit.belongsTo(Client, { foreignKey: 'client_id' });
Task.belongsTo(User, { as: 'assignedTo', foreignKey: 'assigned_to' });
Task.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
Task.belongsTo(Client, { foreignKey: 'client_id' });
Invoice.belongsTo(Client, { foreignKey: 'client_id' });
Invoice.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
Proposal.belongsTo(Client, { foreignKey: 'client_id' });
Proposal.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
Notification.belongsTo(User, { foreignKey: 'user_id' });
WACampaign.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });

// ── LEAD SCORE CALCULATOR ─────────────────────────────────────────
function calculateLeadScore(lead) {
  let score = 0;
  const statusScores = { pending:10, called:20, callback:40, busy:15, no_answer:10, interested:90, not_interested:0, invalid:0 };
  score += statusScores[lead.status] || 0;
  if (lead.email) score += 10;
  if (lead.city)  score += 5;
  const callCount = lead.call_count || 0;
  if (callCount === 1) score += 10;
  if (callCount >= 2)  score += 20;
  if (callCount >= 5)  score += 10;
  if (lead.callback_date) {
    const days = Math.ceil((new Date(lead.callback_date) - new Date()) / (1000*60*60*24));
    if (days >= 0 && days <= 2) score += 20;
    else if (days <= 7) score += 10;
  }
  const catScores = { ecommerce:15, real_estate:20, clinic:15, corporate:15, study_abroad:10, ads_lead:5 };
  score += catScores[lead.category] || 0;
  return Math.min(score, 100);
}

// ── WORK SCHEDULE ─────────────────────────────────────────────────
const WorkSchedule = sequelize.define('WorkSchedule', {
  id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:    { type: DataTypes.INTEGER, allowNull: false },
  work_start: { type: DataTypes.STRING(5), defaultValue: '09:00' },
  work_end:   { type: DataTypes.STRING(5), defaultValue: '18:00' },
  work_days:  { type: DataTypes.JSON, defaultValue: [1,2,3,4,5,6] },
  break_start:{ type: DataTypes.STRING(5), defaultValue: '13:00' },
  break_end:  { type: DataTypes.STRING(5), defaultValue: '14:00' },
  followup_reminder_mins: { type: DataTypes.INTEGER, defaultValue: 30 },
  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'work_schedules', timestamps: true, indexes: [] });

// ── WORK LOGS ─────────────────────────────────────────────────────
const WorkLog = sequelize.define('WorkLog', {
  id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false },
  login_at:     { type: DataTypes.DATE, allowNull: true },
  logout_at:    { type: DataTypes.DATE, allowNull: true },
  duration_mins:{ type: DataTypes.INTEGER, defaultValue: 0 },
  date:         { type: DataTypes.DATEONLY, allowNull: false },
  status:       { type: DataTypes.ENUM('present','absent','late','half_day'), defaultValue: 'present' },
  notes:        { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'work_logs', timestamps: false, indexes: [] });

// ── GST CALCULATOR ────────────────────────────────────────────────
function calculateGST(subtotal, gstPercent, clientState, companyState = 'Kerala') {
  const gst = (subtotal * gstPercent) / 100;
  const isSameState = (clientState || '').toLowerCase() === companyState.toLowerCase();
  if (isSameState) {
    return { type: 'cgst_sgst', cgst: gst/2, sgst: gst/2, igst: 0, total: gst };
  } else {
    return { type: 'igst', cgst: 0, sgst: 0, igst: gst, total: gst };
  }
}

WorkSchedule.belongsTo(User, { foreignKey: 'user_id' });
WorkLog.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize, Op,
  User, Lead, Client, ClientActivity, CallLog,
  Audit, Task, Invoice, Proposal, Notification, WACampaign,
  WorkSchedule, WorkLog,
  calculateLeadScore, calculateGST
};
