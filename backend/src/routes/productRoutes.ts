import { Router } from 'express';
import {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  createStockMovement,
  getStockMovements,
  getAllStockMovements,
} from '../controllers/productController';

import { requireAuth, requireRole } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Global movements list (Admin & Warehouse only)
router.get(
  '/movements/all',
  requireAuth,
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  getAllStockMovements
);

// Read products & movements: ADMIN, WAREHOUSE, SALES, and ACCOUNTS
router.get(
  '/',
  requireAuth,
  requireRole(Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS),
  getProducts
);


router.get(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS),
  getProductById
);

router.get(
  '/:id/stock-movements',
  requireAuth,
  requireRole(Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS),
  getStockMovements
);

// Create, edit, delete, adjust stock: ADMIN and WAREHOUSE only
router.post(
  '/',
  requireAuth,
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  createProduct
);

router.put(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  updateProduct
);

router.delete(
  '/:id',
  requireAuth,
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  deleteProduct
);

router.post(
  '/:id/stock-movements',
  requireAuth,
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  createStockMovement
);

export default router;
