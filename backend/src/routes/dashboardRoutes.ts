import { Router } from 'express';
import {
  getDashboardStats,
  getRecentChallans,
  getLowStockProducts,
} from '../controllers/dashboardController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/stats', requireAuth, getDashboardStats);
router.get('/recent-challans', requireAuth, getRecentChallans);
router.get('/low-stock', requireAuth, getLowStockProducts);

export default router;
