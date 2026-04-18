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
    // Accept locationId (preferred) or location name (fallback for old callers)
    // Also handles managerId passed as locationId — resolveLocation in service handles it
    const locationId   = req.query.locationId ? String(req.query.locationId) : undefined;
    const locationName = req.query.location   ? String(req.query.location)   : undefined;

    if (!locationId && !locationName) {
      return res.status(400).json({ error: 'locationId (or location) is required' });
    }

    const idOrName = locationId || locationName!;

    // Look ahead up to 7 days to find the next day that has availability slots
    for (let offset = 0; offset < 7; offset++) {
      const candidate = new Date();
      candidate.setDate(candidate.getDate() + offset);

      const date      = candidate.toISOString().slice(0, 10);
      const dayOfWeek = candidate.toLocaleString('en-US', { weekday: 'long' });

      const result = await service.getSuggestedSlots({ locationId: idOrName, date, dayOfWeek });

      if (result.slots.length > 0) {
        return res.json(result);
      }
    }

    // No slots found in the next 7 days
    res.json({ slots: [] });
  } catch (err) {
    next(err);
  }
}

export async function validateSlot(req: Request, res: Response, next: NextFunction) {
  try {
    const { locationId, location, date, time } = req.query;

    if ((!locationId && !location) || !date || !time) {
      return res.status(400).json({
        error: 'locationId (or location), date and time are required',
      });
    }

    const result = await service.validateSlot({
      locationId: locationId ? String(locationId) : undefined,
      location:   location   ? String(location)   : undefined,
      date:       String(date),
      startTime:  String(time),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ✅ NEW: Get all managers
export async function getAllManagers(req: Request, res: Response, next: NextFunction) {
  try {
    const managers = await service.getAllManagers();
    res.json(managers);
  } catch (err) {
    next(err);
  }
}

// ✅ NEW: Get locations for a specific manager
export async function getManagerLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const { managerId } = req.params;
    const locations = await service.getManagerLocations(managerId);
    res.json(locations);
  } catch (err) {
    next(err);
  }
}

// ✅ NEW: Get all locations
export async function getAllLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const locations = await service.getAllLocations();
    res.json(locations);
  } catch (err) {
    next(err);
  }
}
