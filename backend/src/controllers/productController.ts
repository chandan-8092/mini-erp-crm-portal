import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { productSchema, stockMovementSchema } from '../validators';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { MovementType } from '@prisma/client';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const category = req.query.category as string;
    const lowStock = req.query.lowStock === 'true';

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (lowStock) {
      // In Prisma, we can do raw filters or field-to-field comparison
      // Since currentStock and minimumStock are database columns, we can use the "lte" filter with prisma fields or filter in JS if total is small.
      // But standard Prisma supports comparison since 5.0.0 using relation/fields, but a clean approach is comparing using:
      // where: { currentStock: { lte: prisma.product.fields.minimumStock } }
      // Alternatively, we can use a raw SQL filter if Prisma version doesn't support field reference or a clean Prisma query:
      where.AND = [
        {
          currentStock: {
            // In Prisma, to do column comparison, we can use raw query or prisma query.
            // Let's check: Prisma does not support comparing columns directly with `lte` in a standard prisma findMany without raw queries,
            // unless we do:
            // currentStock: { lte: 0 } (not what we want).
            // A common way in Prisma is to use raw SQL, or since we are on PostgreSQL, we can use:
            // prisma.$queryRaw or just write a clean where clause:
          }
        }
      ];
      // Wait, let's write it in standard Prisma without column-to-column comparison if possible, or if we must:
      // Since minimumStock is a field, we can do it via a Prisma feature, but to be 100% safe and compatible across database engines (and prisma mocks),
      // we can do a query with a raw statement or use prisma query.
      // Wait, a clean prisma query for column comparison:
      // Since we want to support both Postgres in production and simple mock/in-memory in test, let's check:
      // If we use prisma.$queryRaw, it will fail in tests unless queryRaw is mocked.
      // What if we do a prisma.product.findMany() and filter in JavaScript? That is extremely safe, works with prisma mock, and is very simple.
      // Wait, pagination on JavaScript filtered array:
      // If we filter in JS, pagination won't work on the database side.
      // But we can check: is there a better way?
      // Yes, we can do: we can omit the column comparison if we can, or we can use the Prisma query:
      // `{ currentStock: { lte: prisma.product.fields.minimumStock } }` is not supported directly in old Prisma, but in recent Prisma versions,
      // column comparison is not supported directly. Wait! Prisma actually added column comparison in preview/recent releases.
      // To be safe, we can use raw query OR we can just fetch and filter in JS if lowStock is selected, or if we want database-side,
      // we can query for low stock products using a custom query.
      // Actually, since this is an ERP, the number of products is usually moderate, so filtering in JS for lowStock is completely fine,
      // OR we can do:
      // Let's filter in JS ONLY if lowStock is enabled. If lowStock is not enabled, we paginate on the DB.
      // Let's do that! It is 100% safe, robust, and works with the Prisma Mock.
    }

    // Let's implement the query logic
    if (lowStock) {
      // Fetch all products matching search/category, filter in JS, and paginate manually
      const baseWhere: any = {};
      if (category) baseWhere.category = category;
      if (search) {
        baseWhere.OR = [
          { productName: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      const allMatching = await prisma.product.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
      });

      const lowStockProducts = allMatching.filter(p => p.currentStock <= p.minimumStock);
      const total = lowStockProducts.length;
      const paginated = lowStockProducts.slice(skip, skip + limit);

      return res.status(200).json({
        success: true,
        data: paginated,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Standard pagination on database side
    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: products,
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

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = productSchema.parse(req.body);

    if (!req.user) {
      throw new BadRequestError('User details missing');
    }

    // Check SKU uniqueness
    const existingProduct = await prisma.product.findUnique({
      where: { sku: validatedData.sku },
    });

    if (existingProduct) {
      throw new ConflictError(`Product with SKU ${validatedData.sku} already exists`);
    }

    // Create product and log initial stock IN movement in a transaction
    const product = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          productName: validatedData.productName,
          sku: validatedData.sku,
          category: validatedData.category,
          unitPrice: validatedData.unitPrice,
          currentStock: validatedData.currentStock,
          minimumStock: validatedData.minimumStock,
          warehouseLocation: validatedData.warehouseLocation,
        },
      });

      if (validatedData.currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: prod.id,
            quantityChanged: validatedData.currentStock,
            movementType: MovementType.IN,
            reason: 'Initial stock on product creation',
            createdBy: req.user!.id,
          },
        });
      }

      return prod;
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = productSchema.parse(req.body);

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    // Check SKU uniqueness if changed
    if (existingProduct.sku !== validatedData.sku) {
      const skuDup = await prisma.product.findUnique({ where: { sku: validatedData.sku } });
      if (skuDup) {
        throw new ConflictError(`Product with SKU ${validatedData.sku} already exists`);
      }
    }

    // Update product. Note: We do not allow currentStock to be updated directly via PUT.
    // Stock updates must be done via stock movements to maintain traceability.
    // However, if the user explicitly wants to edit it here, we check:
    // To preserve traceability, we will ignore currentStock in the PUT, or we can check if it changed and record a movement.
    // The clean ERP approach is: PUT product edits details like name, SKU, price, etc.
    // Stock changes must use the stock-movements API.
    // So we preserve the original currentStock from the database, OR update it only if we log a movement.
    // Let's do this: PUT does NOT change currentStock directly.
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        productName: validatedData.productName,
        sku: validatedData.sku,
        category: validatedData.category,
        unitPrice: validatedData.unitPrice,
        minimumStock: validatedData.minimumStock,
        warehouseLocation: validatedData.warehouseLocation,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Product details updated successfully (stock remains unchanged, please use stock-movements API to adjust stock)',
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    await prisma.product.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const createStockMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const validatedData = stockMovementSchema.parse(req.body);

    if (!req.user) {
      throw new BadRequestError('User details missing');
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const qty = validatedData.quantityChanged;
    const type = validatedData.movementType;

    // Calculate new stock
    let newStock = product.currentStock;
    if (type === MovementType.IN) {
      newStock += qty;
    } else {
      newStock -= qty;
    }

    if (newStock < 0) {
      throw new BadRequestError(`Cannot complete movement. Stock cannot be negative. Available: ${product.currentStock}, Requested reduction: ${qty}`);
    }

    // Run update in transaction
    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantityChanged: qty,
          movementType: type,
          reason: validatedData.reason,
          createdBy: req.user!.id,
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: newStock,
        },
      });

      return { movement, product: updatedProduct };
    });

    return res.status(201).json({
      success: true,
      message: `Stock adjusted successfully. New stock: ${result.product.currentStock}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getStockMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const total = await prisma.stockMovement.count({ where: { productId } });
    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: movements,
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

export const getAllStockMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;

    const where: any = {};

    if (search) {
      where.product = {
        OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const total = await prisma.stockMovement.count({ where });
    const movements = await prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { productName: true, sku: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: movements,
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

