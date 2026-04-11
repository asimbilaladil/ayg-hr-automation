import { Request, Response, NextFunction } from 'express';
import * as service from '../services/availability.service';
import {
  CreateAvailabilitySchema,
  UpdateAvailabilitySchema,
  SlotsQuerySchema,
  AvailabilityQuerySchema,
} from '../schemas/availability.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = AvailabilityQuerySchema.parse(req.query);
    const result = await service.listAvailability(query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getSlots(req: Request, res: Response, next: NextFunction) {
  try {
  const query = SlotsQuerySchema.parse(req.query);
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await service.getAvailabilitySlots({
    ...query,
    limit,
  });
  
  res.json(result);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.getAvailabilityById(req.params.id);
    res.json(item);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreateAvailabilitySchema.parse(req.body);
    const item = await service.createAvailability(data);
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdateAvailabilitySchema.parse(req.body);
    const item = await service.updateAvailability(req.params.id, data);
    res.json(item);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteAvailability(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getSuggestions(req: Request, res: Response, next: NextFunction) {
  try {
    const location = String(req.query.location || '');

    if (!location) {
      return res.status(400).json({ error: 'location is required' });
    }

    const result = await service.getSuggestedSlots(location);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function validateSlot(req: Request, res: Response, next: NextFunction) {
  try {
    const { location, date, time } = req.query;

    if (!location || !date || !time) {
      return res.status(400).json({
        error: 'location, date and time are required',
      });
    }

    const result = await service.validateSlot({
      location: String(location),
      date: String(date),
      time: String(time),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
