import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: Array<'SUPER_ADMIN' | 'REGULATION_OFFICER' | 'INSTITUTION_ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Access restricted to authorized roles [${allowedRoles.join(', ')}]`
      });
      return;
    }

    next();
  };
}

export function enforceInstitutionScope(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Super Admin and Officers have global visibility
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'REGULATION_OFFICER') {
    return next();
  }

  // Institution Admin must have an institution assigned
  if (!req.user.institution_id) {
    res.status(403).json({ error: 'Access denied: No institution bound to account' });
    return;
  }

  // If query or body specifies an institution_id, it must match user's institution
  const requestedInstId = req.query.institution_id || req.body.institution_id || req.params.institutionId;
  if (requestedInstId && requestedInstId !== req.user.institution_id) {
    res.status(403).json({
      error: 'Security Violation: Cross-institution data access is strictly prohibited'
    });
    return;
  }

  next();
}
