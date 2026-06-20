import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { syncAygFoodsEmployees } from '../revel/revel.sync.service';

export async function triggerSync(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await syncAygFoodsEmployees();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function listEmployees(req: Request, res: Response, next: NextFunction) {
  try {
    const { establishmentId, isActive } = req.query;

    const employees = await prisma.aygFoodsEmployee.findMany({
      where: {
        ...(establishmentId ? { establishmentId: Number(establishmentId) } : {}),
        ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
      },
      orderBy: [{ establishmentId: 'asc' }, { lastName: 'asc' }],
    });

    res.json({ total: employees.length, employees });
  } catch (err) {
    next(err);
  }
}
