import { Request, Response, NextFunction } from 'express';
import * as service from '../services/sync-cursor.service';
import { SetSyncCursorSchema } from '../schemas/sync-cursor.schema';

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const cursor = await service.getSyncCursor(req.params.key);
    res.json(cursor);
  } catch (err) { next(err); }
}

export async function set(req: Request, res: Response, next: NextFunction) {
  try {
    const data = SetSyncCursorSchema.parse(req.body);
    const cursor = await service.setSyncCursor(req.params.key, data.value);
    res.json(cursor);
  } catch (err) { next(err); }
}
