import { Request, Response, NextFunction } from 'express';
import * as service from '../services/appointments.service';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  AppointmentQuerySchema,
} from '../schemas/appointment.schema';
import { z } from 'zod';

const BulkCancelSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1, 'Cancel reason is required'),
});

const CancelSchema = z.object({
  reason: z.string().min(1, 'Cancel reason is required'),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    AppointmentQuerySchema.parse(req.query);
    // Managers see only their own appointments; Admin/HR/n8n see everything
    const scopedManagerId =
      req.user?.role === 'MANAGER' ? req.user.id : undefined;
    const result = await service.listAppointments(scopedManagerId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const appointment = await service.getAppointmentById(req.params.id);
    res.json(appointment);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreateAppointmentSchema.parse(req.body);
    const appointment = await service.createAppointment(data);
    res.status(201).json(appointment);
  } catch (err: any) {
    // Surface specific errors as 400 instead of generic 500
    const known = ['Candidate not found', 'Location not found', 'Invalid interviewTime format'];
    if (known.some(msg => err?.message?.includes(msg))) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[appointments.create] Unexpected error:', err);
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdateAppointmentSchema.parse(req.body);
    const appointment = await service.updateAppointment(req.params.id, data);
    res.json(appointment);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteAppointment(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = CancelSchema.parse(req.body);
    const user = req.user!;
    if (user.role === 'MANAGER') {
      const appt = await service.getAppointmentById(id);
      if (!appt) return res.status(404).json({ error: 'Appointment not found' });
      if (appt.managerId !== user.id) return res.status(403).json({ error: 'Forbidden' });
    }
    await service.cancelAppointment(id, reason);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function bulkCancel(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids, reason } = BulkCancelSchema.parse(req.body);
    const user = req.user!;
    if (user.role === 'MANAGER') {
      const appts = await service.findAppointmentsByIds(ids);
      if (appts.some(a => a.managerId !== user.id)) {
        return res.status(403).json({ error: 'Forbidden: some appointments do not belong to you' });
      }
    }
    await service.bulkCancelAppointments(ids, reason);
    res.json({ cancelled: ids.length });
  } catch (err) { next(err); }
}
