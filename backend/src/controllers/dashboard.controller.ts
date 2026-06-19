import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const managerId = req.user?.role === 'MANAGER' ? req.user.id : undefined;
    const candidateWhere = managerId ? { hiringManagerId: managerId } : {};
    const appointmentWhere = managerId ? { managerId } : {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalCandidates,
      pendingCandidates,
      reviewedCandidates,
      totalAppointments,
      todayAppointments,
      hire,
      maybe,
      reject,
    ] = await Promise.all([
      prisma.candidate.count({ where: candidateWhere }),
      prisma.candidate.count({ where: { ...candidateWhere, status: 'pending' } }),
      prisma.candidate.count({ where: { ...candidateWhere, status: 'reviewed' } }),
      prisma.appointment.count({ where: appointmentWhere }),
      prisma.appointment.count({
        where: {
          ...appointmentWhere,
          interviewDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.candidate.count({ where: { ...candidateWhere, aiRecommendation: 'HIRE' } }),
      prisma.candidate.count({ where: { ...candidateWhere, aiRecommendation: 'MAYBE' } }),
      prisma.candidate.count({ where: { ...candidateWhere, aiRecommendation: 'REJECT' } }),
    ]);

    res.json({
      totalCandidates,
      pendingCandidates,
      reviewedCandidates,
      totalAppointments,
      todayAppointments,
      aiBreakdown: { hire, maybe, reject },
    });
  } catch (err) {
    next(err);
  }
}
