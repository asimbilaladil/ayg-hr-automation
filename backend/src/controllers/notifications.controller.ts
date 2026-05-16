import { Request, Response, NextFunction } from 'express';
import * as service from '../services/notifications.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await service.listNotifications(req.user.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await service.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function markOneRead(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await service.markOneRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}
