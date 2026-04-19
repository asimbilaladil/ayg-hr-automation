import { Request, Response, NextFunction } from 'express';

type Role = 'ADMIN' | 'MANAGER' | 'HR';

const roleHierarchy: Record<Role, number> = {
  ADMIN: 3,
  MANAGER: 2,
  HR: 1,
};

export function rbac(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // n8n API key bypasses RBAC
    if (req.isN8N) return next();

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user.role as Role;
    const hasAccess = allowedRoles.some(
      (role) => roleHierarchy[userRole] >= roleHierarchy[role]
    );

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

/** Exact role check — only the listed roles pass (no hierarchy inheritance). */
export function rbacExact(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.isN8N) return next();

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!(allowedRoles as string[]).includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
}
