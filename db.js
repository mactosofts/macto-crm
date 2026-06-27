require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'macto_crm',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

const User = sequelize.define('User', {
  id:       { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:     { type: DataTypes.STRING(100), allowNull: false },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role:     { type: DataTypes.ENUM('admin','staff','auditor'), defaultValue: 'staff' },
  active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  whatsapp: { type: DataTypes.STRING(20), allowNull: true },
  daily_target: { type: DataTypes.INTEGER, defaultValue: 50 },
}, { tableName: 'users', timestamps: true });

const Lead = sequelize.define('Lead', {
  id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:          { type: DataTypes.STRING(150) },
  phone:         { type: DataTypes.STRING(20) },
  email:         { type: DataTypes.STRING(150) },
  city:          { type: DataTypes.STRING(100) },
  state:         { type: DataTypes.STRING(100) },
  category:      { type: DataTypes.ENUM('ecommerce','real_estate','clinic','study_abroad','ads_lead','restaurant','retail','corporate','other'), defaultValue: 'other' },
  business_type: { type: DataTypes.STRING(150) },
  source:        { type: DataTypes.ENUM('cold_call','ads','referral','audit','manual','import'), defaultValue: 'cold_call' },
  status:        { type: DataTypes.ENUM('pending','called','interested','not_interested','callback','busy','no_answer','invalid'), defaultValue: 'pending' },
  assigned_to:   { type: DataTypes.INTEGER, allowNull: true },
  callback_date: { type: DataTypes.DATEONLY, allowNull: true },
  last_note:     { type: DataTypes.TEXT },
  not_converted_reason: { type: DataTypes.TEXT },
  extra:         { type: DataTypes.JSON },
}, { tableName: 'leads', timestamps: true });

const Client = sequelize.define('Client', {
  id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:           { type: DataTypes.STRING(150), allowNull: false },
  company:        { type: DataTypes.STRING(200) },
  phone:          { type: DataTypes.STRING(20) },
  email:          { type: DataTypes.STRING(150) },
  city:           { type: DataTypes.STRING(100) },
  state:          { type: DataTypes.STRING(100) },
  website:        { type: DataTypes.STRING(255) },
  category:       { type: DataTypes.ENUM('ecommerce','real_estate','clinic','study_abroad','ads_lead','restaurant','retail','corporate','other'), defaultValue: 'other' },
  source:         { type: DataTypes.ENUM('cold_call','ads','referral','audit','manual'), defaultValue: 'cold_call' },
  lead_id:        { type: DataTypes.INTEGER, allowNull: true },
  pipeline_stage: { type: DataTypes.ENUM('interested','follow_up_1','follow_up_2','follow_up_3','meeting_scheduled','meeting_done','proposal_shared','negotiation','invoice_shared','advance_paid','converted','work_started','in_progress','deployed','completed','lost'), defaultValue: 'interested' },
  assigned_to:    { type: DataTypes.INTEGER, allowNull: true },
  managed_by:     { type: DataTypes.INTEGER, allowNull: true },
  project_value:  { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  advance_paid:   { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total_received: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  project_type:   { type: DataTypes.STRING(200) },
  progress_percent: { type: DataTypes.INTEGER, defaultValue: 0 },
  next_followup:  { type: DataTypes.DATEONLY, allowNull: true },
  notes:          { type: DataTypes.TEXT },
  lost_reason:    { type: DataTypes.TEXT },
  converted_at:   { type: DataTypes.DATE, allowNull: true },
  deployed_at:    { type: DataTypes.DATE, allowNull: true },
  completed_at:   { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'clients', timestamps: true });

const ClientActivity = sequelize.define('ClientActivity', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  client_id:   { type: DataTypes.INTEGER, allowNull: false },
  user_id:     { type: DataTypes.INTEGER, allowNull: false },
  type:        { type: DataTypes.ENUM('note','call','meeting','proposal','invoice','payment','stage_change','followup','whatsapp'), defaultValue: 'note' },
  title:       { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  amount:      { type: DataTypes.DECIMAL(12,2), allowNull: true },
  date:        { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  next_action: { type: DataTypes.STRING(255) },
  next_date:   { type: DataTypes.DATEONLY, allowNull: true },
}, { tableName: 'client_activities', timestamps: false });

const CallLog = sequelize.define('CallLog', {
  id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id:   { type: DataTypes.INTEGER, allowNull: false },
  staff_id:  { type: DataTypes.INTEGER, allowNull: false },
  status:    { type: DataTypes.STRING(50) },
  note:      { type: DataTypes.TEXT },
  call_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'call_logs', timestamps: false });

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
}, { tableName: 'audits', timestamps: true });

const Task = sequelize.define('Task', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title:       { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  assigned_to: { type: DataTypes.INTEGER, allowNull: false },
  created_by:  { type: DataTypes.INTEGER, allowNull: false },
  client_id:   { type: DataTypes.INTEGER, allowNull: true },
  lead_id:     { type: DataTypes.INTEGER, allowNull: true },
  due_date:    { type: DataTypes.DATEONLY, allowNull: true },
  priority:    { type: DataTypes.ENUM('low','medium','high','urgent'), defaultValue: 'medium' },
  status:      { type: DataTypes.ENUM('pending','in_progress','done','cancelled'), defaultValue: 'pending' },
  completed_at:{ type: DataTypes.DATE, allowNull: true },
}, { tableName: 'tasks', timestamps: true });

const Invoice = sequelize.define('Invoice', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  invoice_no:  { type: DataTypes.STRING(50), allowNull: false, unique: true },
  client_id:   { type: DataTypes.INTEGER, allowNull: false },
  created_by:  { type: DataTypes.INTEGER, allowNull: false },
  items:       { type: DataTypes.JSON },
  subtotal:    { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  gst_percent: { type: DataTypes.DECIMAL(5,2), defaultValue: 18 },
  gst_amount:  { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total:       { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  status:      { type: DataTypes.ENUM('draft','sent','paid','cancelled'), defaultValue: 'draft' },
  due_date:    { type: DataTypes.DATEONLY, allowNull: true },
  notes:       { type: DataTypes.TEXT },
  paid_at:     { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'invoices', timestamps: true });

const Notification = sequelize.define('Notification', {
  id:      { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title:   { type: DataTypes.STRING(255) },
  message: { type: DataTypes.TEXT },
  type:    { type: DataTypes.ENUM('task','client','lead','invoice','system'), defaultValue: 'system' },
  read:    { type: DataTypes.BOOLEAN, defaultValue: false },
  link:    { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'notifications', timestamps: true });

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
Notification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { sequelize, User, Lead, Client, ClientActivity, CallLog, Audit, Task, Invoice, Notification };
