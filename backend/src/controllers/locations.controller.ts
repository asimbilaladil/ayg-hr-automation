import { Request, Response, NextFunction } from 'express';
import * as service from '../services/locations.service';
import {
  CreateLocationSchema,
  UpdateLocationSchema,
} from '../schemas/location.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const locations = await service.listLocations();
    res.json({ data: locations, total: locations.length });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const location = await service.getLocationById(req.params.id);
    res.json(location);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreateLocationSchema.parse(req.body);
    const location = await service.createLocation(data);
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = UpdateLocationSchema.parse(req.body);
    const location = await service.updateLocation(req.params.id, data);
    res.json(location);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteLocation(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
