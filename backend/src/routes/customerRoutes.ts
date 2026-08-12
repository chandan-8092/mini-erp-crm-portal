import { Router } from 'express';
import {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  addFollowUp,
  getFollowUps,
} from '../controllers/customerController';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Read customer info: ADMIN, SALES, and ACCOUNTS
router.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  getCustomers
);

router.get(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  getCustomerById
);

// Create, edit, delete customers: ADMIN and SALES only
router.post(
  '/',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES),
  createCustomer
);

router.put(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES),
  updateCustomer
);

router.delete(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES),
  deleteCustomer
);

// Follow-ups CRM
router.post(
  '/:id/followups',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES),
  addFollowUp
);

router.get(
  '/:id/followups',
  requireAuth,
  requireRole(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  getFollowUps
);

export default router;
