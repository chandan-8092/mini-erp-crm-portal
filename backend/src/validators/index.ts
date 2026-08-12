import { z } from 'zod';
import { CustomerType, CustomerStatus, MovementType } from '@prisma/client';


// Auth Validators
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// Customer Validators
export const customerSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobileNumber: z.string().regex(/^\+?[1-9]\d{1,14}$|^[0-9]{10}$/, 'Invalid mobile number format'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format (e.g. 29ABCDE1234F1Z5)').optional().nullable().or(z.literal('')),
  customerType: z.nativeEnum(CustomerType),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  status: z.nativeEnum(CustomerStatus),
  followUpDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
  notes: z.string().optional().default(''),
});

// Follow-up Validators
export const followupSchema = z.object({
  note: z.string().min(5, 'Follow-up note must be at least 5 characters'),
  followUpDate: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
});

// Product Validators
export const productSchema = z.object({
  productName: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  currentStock: z.number().int().nonnegative('Stock cannot be negative').optional().default(0),
  minimumStock: z.number().int().nonnegative('Minimum stock alert quantity cannot be negative'),
  warehouseLocation: z.string().min(2, 'Warehouse location description must be specified'),
});

// Stock Movement Validators (Manual Adjustments)
export const stockMovementSchema = z.object({
  quantityChanged: z.number().int().positive('Quantity must be greater than zero'),
  movementType: z.nativeEnum(MovementType),
  reason: z.string().min(5, 'A valid description of at least 5 characters is required'),
});

// Sales Challan Item Schema
const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
});

// Sales Challan Create Schema
export const createChallanSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(challanItemSchema).min(1, 'At least one product item is required'),
});

// Sales Challan Edit Schema (Drafts only)
export const editChallanSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  items: z.array(challanItemSchema).min(1, 'At least one product item is required').optional(),
});
