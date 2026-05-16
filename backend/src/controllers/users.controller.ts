import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as service from '../services/users.service';

const UpdateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'HR']),
});

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'HR', 'MANAGER']),
  locationName: z.string().optional(),
});

const UpdateEmailSchema = z.object({
  email: z.string().email(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const SwapLocationsSchema = z.object({
  managerAId: z.string().min(1),
  managerBId: z.string().min(1),
});

const AssignLocationSchema = z.object({
  managerId: z.string().min(1),
  locationName: z.string().optional(),
  locationId: z.string().optional(),
}).refine(d => d.locationName?.trim() || d.locationId, {
  message: 'Either locationName or locationId is required',
});

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = CreateUserSchema.parse(req.body);
    const result = await service.createUser(data);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: 'That email address is already in use' });
    }
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await service.listUsers();
    res.json({ data: users, total: users.length });
  } catch (err) { next(err); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await service.getUserById(req.user.id);
    res.json(user);
  } catch (err) { next(err); }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { role } = UpdateRoleSchema.parse(req.body);
    const user = await service.updateUserRole(req.params.id, role);
    res.json(user);
  } catch (err) { next(err); }
}

export async function updateEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = UpdateEmailSchema.parse(req.body);
    const user = await service.updateUserEmail(req.params.id, email);
    res.json(user);
  } catch (err: any) {
    if (err.message === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: 'That email address is already in use' });
    }
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.resetUserPassword(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    await service.changeUserPassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === 'WRONG_PASSWORD') {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    if (err.message === 'TOO_SHORT') {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    if (err.message === 'NO_PASSWORD') {
      return res.status(400).json({ error: 'No password set on this account' });
    }
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await service.deactivateUser(req.params.id);
    res.json(user);
  } catch (err) { next(err); }
}

export async function deleteManager(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.deleteManager(req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Manager not found' });
    if (err.message === 'NOT_MANAGER') return res.status(400).json({ error: 'Only managers can be deleted this way' });
    next(err);
  }
}

export async function listLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const locations = await service.listLocations();
    res.json({ data: locations });
  } catch (err) { next(err); }
}

export async function assignLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const { managerId, locationName, locationId } = AssignLocationSchema.parse(req.body);
    const result = await service.assignLocation(managerId, { locationName, locationId });
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === 'MANAGER_NOT_FOUND') return res.status(404).json({ error: 'Manager not found' });
    if (err.message === 'MANAGER_HAS_LOCATION') return res.status(400).json({ error: 'This manager already has a location assigned' });
    if (err.message === 'LOCATION_NOT_FOUND') return res.status(404).json({ error: 'Location not found' });
    if (err.message === 'NO_LOCATION_OPTION') return res.status(400).json({ error: 'Provide a new location name or an existing location' });
    next(err);
  }
}

export async function swapPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const { managerAId, managerBId } = SwapLocationsSchema.parse(req.query);
    const preview = await service.getSwapPreview(managerAId, managerBId);
    res.json(preview);
  } catch (err: any) {
    if (err.message === 'SAME_MANAGER') return res.status(400).json({ error: 'Select two different managers' });
    if (err.message === 'MANAGER_A_NOT_FOUND' || err.message === 'MANAGER_B_NOT_FOUND') return res.status(404).json({ error: 'Manager not found' });
    if (err.message === 'MANAGER_A_NO_LOCATION') return res.status(400).json({ error: 'First manager has no location assigned' });
    if (err.message === 'MANAGER_B_NO_LOCATION') return res.status(400).json({ error: 'Second manager has no location assigned' });
    next(err);
  }
}

export async function swapLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const { managerAId, managerBId } = SwapLocationsSchema.parse(req.body);
    const result = await service.swapManagerLocations(managerAId, managerBId);
    res.json(result);
  } catch (err: any) {
    if (err.message === 'SAME_MANAGER') return res.status(400).json({ error: 'Select two different managers' });
    if (err.message === 'MANAGER_A_NOT_FOUND' || err.message === 'MANAGER_B_NOT_FOUND') return res.status(404).json({ error: 'Manager not found' });
    if (err.message === 'MANAGER_A_NO_LOCATION') return res.status(400).json({ error: 'First manager has no location assigned' });
    if (err.message === 'MANAGER_B_NO_LOCATION') return res.status(400).json({ error: 'Second manager has no location assigned' });
    next(err);
  }
}
