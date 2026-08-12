import { Router } from 'express';
import {
  getChallans,
  createChallan,
  getChallanById,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from '../controllers/challanController';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Read challans: ADMIN, SALES, WAREHOUSE, and ACCOUNTS
router.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  getChallans
);

router.get(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  getChallanById
);

// Create, edit, confirm, cancel challans: ADMIN and SALES only
router.post(
  '/',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES),
  createChallan
);

router.put(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES),
  updateChallan
);

router.post(
  '/:id/confirm',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES),
  confirmChallan
);

router.post(
  '/:id/cancel',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES),
  cancelChallan
);

export default router;
