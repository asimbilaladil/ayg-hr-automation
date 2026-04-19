import { Request, Response, NextFunction } from 'express';
import * as service from '../services/appointments.service';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  AppointmentQuerySchema,
} from '../schemas/appointment.schema';

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
  } catch (err) { next(err); }
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
