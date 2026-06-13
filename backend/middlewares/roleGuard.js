// middlewares/roleGuard.js
/**
 * Role guard middleware for Express.
 * Usage: app.use(roleGuard(['empresa', 'contador']));
 */
export function roleGuard(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Token inválido ou sem papel' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    next();
  };
}
