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

export async function markCalled(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { called } = req.body as { called: boolean };

    const employee = await prisma.aygFoodsEmployee.update({
      where: { id },
      data: {
        called,
        calledAt: called ? new Date() : null,
      },
      include: {
        location: { select: { name: true } },
        manager:  { select: { name: true } },
      },
    });

    res.json(employee);
  } catch (err) {
    next(err);
  }
}

export async function upsertReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { q1Rating, q2Rating, q4Rating, q3Notes, q5Notes, q6Notes, q7Notes, overallNotes, reviewedAt } = req.body;

    const review = await prisma.onboardingReview.upsert({
      where: { employeeId: id },
      create: {
        employeeId: id,
        q1Rating, q2Rating, q4Rating,
        q3Notes, q5Notes, q6Notes, q7Notes,
        overallNotes,
        reviewedAt: reviewedAt ? new Date(reviewedAt) : new Date(),
      },
      update: {
        q1Rating, q2Rating, q4Rating,
        q3Notes, q5Notes, q6Notes, q7Notes,
        overallNotes,
        reviewedAt: reviewedAt ? new Date(reviewedAt) : new Date(),
      },
    });

    // also mark employee as called
    await prisma.aygFoodsEmployee.update({
      where: { id },
      data: { called: true, calledAt: review.reviewedAt },
    });

    res.json(review);
  } catch (err) {
    next(err);
  }
}

export async function getReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const review = await prisma.onboardingReview.findUnique({ where: { employeeId: id } });
    res.json(review ?? null);
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
      include: {
        location: {
          select: {
            id: true, name: true, address: true,
            manager: { select: { id: true, name: true, email: true } },
          },
        },
        review: true,
      },
      orderBy: [{ establishmentId: 'asc' }, { lastName: 'asc' }],
    });

    res.json({ total: employees.length, employees });
  } catch (err) {
    next(err);
  }
}
