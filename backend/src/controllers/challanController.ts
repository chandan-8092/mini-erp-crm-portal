import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { createChallanSchema, editChallanSchema } from '../validators';
import { NotFoundError, BadRequestError, InsufficientStockError } from '../utils/errors';
import { ChallanStatus, MovementType } from '@prisma/client';

/**
 * Generate a unique Challan Number in format CH-YYYY-XXXXX
 */
async function generateChallanNumber(tx: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `CH-${currentYear}-`;

  // Find latest challan matching prefix
  const latestChallan = await tx.salesChallan.findFirst({
    where: {
      challanNumber: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      challanNumber: 'desc',
    },
  });

  let nextSerialNum = 1;
  if (latestChallan) {
    const parts = latestChallan.challanNumber.split('-');
    const lastPart = parts[parts.length - 1];
    const latestSerial = parseInt(lastPart, 10);
    if (!isNaN(latestSerial)) {
      nextSerialNum = latestSerial + 1;
    }
  }

  const paddedSerial = String(nextSerialNum).padStart(5, '0');
  return `${yearPrefix}${paddedSerial}`;
}

export const getChallans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const status = req.query.status as ChallanStatus;
    const customerId = req.query.customerId as string;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.challanNumber = { contains: search, mode: 'insensitive' };
    }

    const total = await prisma.salesChallan.count({ where });
    const challans = await prisma.salesChallan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, customerName: true, businessName: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: challans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createChallanSchema.parse(req.body);

    if (!req.user) {
      throw new BadRequestError('User details missing');
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Validate products exist and map snapshots
    const itemsWithSnapshots: {
      productId: string;
      productNameSnapshot: string;
      skuSnapshot: string;
      unitPriceSnapshot: number;
      quantity: number;
      subtotal: number;
    }[] = [];
    let totalQuantity = 0;


    for (const item of validatedData.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${item.productId} not found`);
      }

      totalQuantity += item.quantity;
      itemsWithSnapshots.push({
        productId: product.id,
        productNameSnapshot: product.productName,
        skuSnapshot: product.sku,
        unitPriceSnapshot: product.unitPrice,
        quantity: item.quantity,
        subtotal: product.unitPrice * item.quantity,
      });
    }

    // Run creation inside transaction to ensure unique challan number generation
    const challan = await prisma.$transaction(async (tx) => {
      const challanNumber = await generateChallanNumber(tx);

      return await tx.salesChallan.create({
        data: {
          challanNumber,
          customerId: validatedData.customerId,
          totalQuantity,
          status: ChallanStatus.DRAFT, // Always starts as Draft
          createdBy: req.user!.id,
          items: {
            create: itemsWithSnapshots,
          },
        },
        include: {
          items: true,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Draft sales challan created successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const getChallanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: true,
      },
    });

    if (!challan) {
      throw new NotFoundError('Sales challan not found');
    }

    return res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const updateChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = editChallanSchema.parse(req.body);

    const existingChallan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingChallan) {
      throw new NotFoundError('Sales challan not found');
    }

    if (existingChallan.status !== ChallanStatus.DRAFT) {
      throw new BadRequestError('Only DRAFT sales challans can be edited.');
    }

    const customerId = validatedData.customerId || existingChallan.customerId;

    // Verify customer
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Resolve items if supplied
    let itemsWithSnapshots: {
      productId: string;
      productNameSnapshot: string;
      skuSnapshot: string;
      unitPriceSnapshot: number;
      quantity: number;
      subtotal: number;
    }[] | undefined = undefined;
    let totalQuantity = existingChallan.totalQuantity;

    if (validatedData.items) {
      itemsWithSnapshots = [];

      totalQuantity = 0;

      for (const item of validatedData.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundError(`Product with ID ${item.productId} not found`);
        }

        totalQuantity += item.quantity;
        itemsWithSnapshots.push({
          productId: product.id,
          productNameSnapshot: product.productName,
          skuSnapshot: product.sku,
          unitPriceSnapshot: product.unitPrice,
          quantity: item.quantity,
          subtotal: product.unitPrice * item.quantity,
        });
      }
    }

    // Run update in transaction
    const updatedChallan = await prisma.$transaction(async (tx) => {
      // If items are modified, wipe old ones and recreate
      if (itemsWithSnapshots) {
        await tx.salesChallanItem.deleteMany({
          where: { challanId: id },
        });
      }

      return await tx.salesChallan.update({
        where: { id },
        data: {
          customerId,
          totalQuantity,
          ...(itemsWithSnapshots
            ? {
                items: {
                  create: itemsWithSnapshots,
                },
              }
            : {}),
        },
        include: {
          items: true,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Sales challan updated successfully',
      data: updatedChallan,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new BadRequestError('User details missing');
    }

    // Run confirmation logic inside database transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch challan with items
      const challan = await tx.salesChallan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        throw new NotFoundError('Sales challan not found');
      }

      if (challan.status !== ChallanStatus.DRAFT) {
        throw new BadRequestError(`Challan is already ${challan.status} and cannot be confirmed.`);
      }

      // 2. Validate inventory for all items
      for (const item of challan.items) {
        // Fetch product with lock (using select for update if supported, or just read inside TX)
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundError(`Product ${item.productNameSnapshot} (${item.skuSnapshot}) not found`);
        }

        if (product.currentStock < item.quantity) {
          // Reject entire transaction!
          throw new InsufficientStockError(product.productName, product.currentStock, item.quantity);
        }
      }

      // 3. Subtract inventory and record movements
      for (const item of challan.items) {
        // Fetch current product stock state
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const newStock = product!.currentStock - item.quantity;

        // Perform stock reduction
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        // Record StockMovement OUT
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: MovementType.OUT,
            reason: `Sales Challan Confirmation (${challan.challanNumber})`,
            createdBy: req.user!.id,
          },
        });
      }

      // 4. Mark challan status as CONFIRMED
      const confirmed = await tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CONFIRMED },
        include: { items: true },
      });

      return confirmed;
    });

    return res.status(200).json({
      success: true,
      message: 'Sales challan confirmed and inventory updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new BadRequestError('User details missing');
    }

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new NotFoundError('Sales challan not found');
    }

    if (challan.status === ChallanStatus.CANCELLED) {
      throw new BadRequestError('Sales challan is already cancelled.');
    }

    const oldStatus = challan.status;

    // Run cancel operation inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // If the challan was CONFIRMED, we must return the items to stock (IN movement)
      if (oldStatus === ChallanStatus.CONFIRMED) {
        for (const item of challan.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product) {
            // Restore stock
            await tx.product.update({
              where: { id: item.productId },
              data: {
                currentStock: product.currentStock + item.quantity,
              },
            });

            // Log StockMovement IN
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                quantityChanged: item.quantity,
                movementType: MovementType.IN,
                reason: `Sales Challan Cancellation (${challan.challanNumber}) - Restored Stock`,
                createdBy: req.user!.id,
              },
            });
          }
        }
      }

      // Update status to CANCELLED
      return await tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CANCELLED },
        include: { items: true },
      });
    });

    return res.status(200).json({
      success: true,
      message: oldStatus === ChallanStatus.CONFIRMED
        ? 'Sales challan cancelled. Inventory stock restored successfully.'
        : 'Sales challan cancelled successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
