import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { customerSchema, followupSchema } from '../validators';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CustomerStatus, CustomerType } from '@prisma/client';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const status = req.query.status as CustomerStatus;
    const customerType = req.query.customerType as CustomerType;

    // Build query conditions
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerType) {
      where.customerType = customerType;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.customer.count({ where });
    const totalPages = Math.ceil(total / limit);

    // Get data
    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = customerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: validatedData,
    });

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            challanNumber: true,
            totalQuantity: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = customerSchema.parse(req.body);

    // Verify customer exists
    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      throw new NotFoundError('Customer not found');
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: validatedData,
    });

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      throw new NotFoundError('Customer not found');
    }

    await prisma.customer.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const addFollowUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: customerId } = req.params;
    const validatedData = followupSchema.parse(req.body);

    if (!req.user) {
      throw new BadRequestError('User details missing');
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Run in a transaction: create follow-up and update customer's next follow-up date and notes
    const followUp = await prisma.$transaction(async (tx) => {
      const fUp = await tx.followUp.create({
        data: {
          customerId,
          note: validatedData.note,
          followUpDate: validatedData.followUpDate,
          createdBy: req.user!.id,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          followUpDate: validatedData.followUpDate,
        },
      });

      return fUp;
    });

    return res.status(201).json({
      success: true,
      message: 'Follow-up note added successfully',
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowUps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: customerId } = req.params;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const followUps = await prisma.followUp.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: followUps,
    });
  } catch (error) {
    next(error);
  }
};
