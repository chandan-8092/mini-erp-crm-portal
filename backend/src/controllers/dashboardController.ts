import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { CustomerStatus, ChallanStatus } from '@prisma/client';

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Total Customers & Active Customers
    const totalCustomers = await prisma.customer.count();
    const activeCustomers = await prisma.customer.count({
      where: { status: CustomerStatus.ACTIVE },
    });

    // 2. Total Products & Low Stock Products
    const totalProducts = await prisma.product.count();

    // Since we need to find products where currentStock <= minimumStock, we fetch them
    // and filter, or do raw query. For stats, let's fetch IDs/stocks and count, which is clean and database agnostic
    const products = await prisma.product.findMany({
      select: { currentStock: true, minimumStock: true },
    });
    const lowStockProductsCount = products.filter(p => p.currentStock <= p.minimumStock).length;

    // 3. Draft & Confirmed Challans
    const draftChallansCount = await prisma.salesChallan.count({
      where: { status: ChallanStatus.DRAFT },
    });
    const confirmedChallansCount = await prisma.salesChallan.count({
      where: { status: ChallanStatus.CONFIRMED },
    });

    // 4. Fetch recent items for dashboard overview
    const recentCustomers = await prisma.customer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, customerName: true, businessName: true, status: true, createdAt: true },
    });

    const recentStockMovements = await prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { productName: true, sku: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalCustomers,
        activeCustomers,
        totalProducts,
        lowStockProducts: lowStockProductsCount,
        draftChallans: draftChallansCount,
        confirmedChallans: confirmedChallansCount,
      },
      recentCustomers,
      recentStockMovements,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentChallans = async (_req: Request, res: Response, next: NextFunction) => {

  try {
    const recentChallans = await prisma.salesChallan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { customerName: true, businessName: true },
        },
        creator: {
          select: { name: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: recentChallans,
    });
  } catch (error) {
    next(error);
  }
};

export const getLowStockProducts = async (_req: Request, res: Response, next: NextFunction) => {

  try {
    // Fetch all products and filter in JS to support mock environment
    const allProducts = await prisma.product.findMany({
      orderBy: { productName: 'asc' },
    });

    const lowStockProducts = allProducts.filter((p) => p.currentStock <= p.minimumStock);

    return res.status(200).json({
      success: true,
      data: lowStockProducts,
    });
  } catch (error) {
    next(error);
  }
};
