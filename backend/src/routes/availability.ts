import { Router } from 'express';
import { auth, apiKeyAuth } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import * as ctrl from '../controllers/availability.controller';

const router = Router();

// n8n / Vapi slot lookup
router.get('/slots', apiKeyAuth, ctrl.getSlots);
router.get('/suggestions',apiKeyAuth, ctrl.getSuggestions);
router.get('/validate',apiKeyAuth, ctrl.validateSlot);

// Frontend endpoints
router.get('/', auth, rbac('HR'), ctrl.list);
router.get('/managers/list', auth, rbac('HR'), ctrl.getAllManagers);
router.get('/managers/:managerId/locations', auth, rbac('HR'), ctrl.getManagerLocations);
router.get('/locations/list', auth, rbac('HR'), ctrl.getAllLocations);
router.get('/:id', auth, rbac('MANAGER'), ctrl.getById);
router.post('/', auth, rbac('MANAGER'), ctrl.create);
router.patch('/:id', auth, rbac('MANAGER'), ctrl.update);
router.delete('/:id', auth, rbac('MANAGER'), ctrl.remove);


export default router;
