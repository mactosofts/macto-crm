const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'macto_crm',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
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
  role:     { type: DataTypes.ENUM('admin', 'staff'), defaultValue: 'staff' },
  active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'users', timestamps: true });

const Lead = sequelize.define('Lead', {
  id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:          { type: DataTypes.STRING(150) },
  phone:         { type: DataTypes.STRING(20) },
  email:         { type: DataTypes.STRING(150) },
  city:          { type: DataTypes.STRING(100) },
  state:         { type: DataTypes.STRING(100) },
  category:      { type: DataTypes.STRING(100) },
  business_type: { type: DataTypes.STRING(150) },
  source:        { type: DataTypes.STRING(100) },
  status:        { type: DataTypes.ENUM('pending','called','interested','not_interested','callback','busy','no_answer','converted','invalid'), defaultValue: 'pending' },
  assigned_to:   { type: DataTypes.INTEGER, allowNull: true },
  callback_date: { type: DataTypes.DATEONLY, allowNull: true },
  last_note:     { type: DataTypes.TEXT },
  extra:         { type: DataTypes.JSON },
}, { tableName: 'leads', timestamps: true });

const CallLog = sequelize.define('CallLog', {
  id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  lead_id:   { type: DataTypes.INTEGER, allowNull: false },
  staff_id:  { type: DataTypes.INTEGER, allowNull: false },
  status:    { type: DataTypes.STRING(50) },
  note:      { type: DataTypes.TEXT },
  call_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'call_logs', timestamps: false });

Lead.belongsTo(User, { as: 'assignedStaff', foreignKey: 'assigned_to' });
User.hasMany(Lead, { foreignKey: 'assigned_to' });
CallLog.belongsTo(Lead, { foreignKey: 'lead_id' });
CallLog.belongsTo(User, { as: 'staff', foreignKey: 'staff_id' });

module.exports = { sequelize, User, Lead, CallLog };
