import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from '../services/users.service';

const UpdateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'HR']),
});

const UpdateEmailSchema = z.object({
  email: z.string().email(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await service.listUsers();
    res.json({ data: users, total: users.length });
  } catch (err) { next(err); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await service.getUserById(req.user.id);
    res.json(user);
  } catch (err) { next(err); }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { role } = UpdateRoleSchema.parse(req.body);
    const user = await service.updateUserRole(req.params.id, role);
    res.json(user);
  } catch (err) { next(err); }
}

export async function updateEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = UpdateEmailSchema.parse(req.body);
    const user = await service.updateUserEmail(req.params.id, email);
    res.json(user);
  } catch (err: any) {
    if (err.message === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: 'That email address is already in use' });
    }
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.resetUserPassword(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.deactivateUser(req.params.id);
    res.json(user);
  } catch (err) { next(err); }
}
