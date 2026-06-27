exports.apiAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
};
exports.apiAdmin = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin only' });
  next();
};
exports.apiAdminOrAuditor = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!['admin','auditor'].includes(req.session.user.role)) return res.status(403).json({ ok: false, error: 'Not allowed' });
  next();
};
