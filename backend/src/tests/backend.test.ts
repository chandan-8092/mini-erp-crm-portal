import prisma from '../config/db';
import request from 'supertest';
import app from '../index';
import { Role, CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

jest.mock('../config/db', () => {
  const mockPrismaClient: any = {
    $transaction: jest.fn((callback) => callback(mockPrismaClient)),

    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    salesChallan: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    salesChallanItem: {
      deleteMany: jest.fn(),
    },
    followUp: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrismaClient,
  };
});

const mockPrisma = prisma as any;


describe('ERP + CRM Backend Test Suite', () => {
  const jwtSecret = 'super-secret-jwt-key-change-this-in-production';
  let adminToken: string;
  let accountsToken: string;
  let salesToken: string;

  const mockAdminUser = {
    id: 'admin-uuid',
    name: 'Admin User',
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: Role.ADMIN,
  };

  const mockAccountsUser = {
    id: 'accounts-uuid',
    name: 'Accounts User',
    email: 'accounts@example.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: Role.ACCOUNTS,
  };

  const mockSalesUser = {
    id: 'sales-uuid',
    name: 'Sales User',
    email: 'sales@example.com',
    passwordHash: bcrypt.hashSync('password123', 10),
    role: Role.SALES,
  };

  beforeAll(() => {
    // Generate valid tokens for roles
    adminToken = jwt.sign(
      { id: mockAdminUser.id, email: mockAdminUser.email, role: mockAdminUser.role },
      jwtSecret
    );
    accountsToken = jwt.sign(
      { id: mockAccountsUser.id, email: mockAccountsUser.email, role: mockAccountsUser.role },
      jwtSecret
    );
    salesToken = jwt.sign(
      { id: mockSalesUser.id, email: mockSalesUser.email, role: mockSalesUser.role },
      jwtSecret
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Login Tests
  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe(Role.ADMIN);
    });

    it('should return 401 for incorrect password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // 2. Unauthorized API Access
  describe('Unauthorized Access Protection', () => {
    it('should reject requests without a token with 401', async () => {
      const res = await request(app).get('/api/customers');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // 3. Role Authorization
  describe('Role-Based Access Control', () => {
    it('should allow Admin to view customers', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.customer.count.mockResolvedValue(0);
      mockPrisma.customer.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should deny Accounts user trying to create a customer with 403', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAccountsUser);

      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${accountsToken}`)
        .send({
          customerName: 'New Client',
          mobileNumber: '9999988888',
          email: 'client@example.com',
          businessName: 'JD Enterprise',
          gstNumber: '29ABCDE1234F1Z5',
          customerType: CustomerType.RETAIL,
          address: '45 Main St',
          status: CustomerStatus.LEAD,
          followUpDate: new Date(),
          notes: 'Test note',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // 4. Create Customer
  describe('POST /api/customers', () => {
    it('should create a customer successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockSalesUser);
      const customerData = {
        customerName: 'New Client',
        mobileNumber: '9999988888',
        email: 'client@example.com',
        businessName: 'JD Enterprise',
        gstNumber: '29ABCDE1234F1Z5',
        customerType: CustomerType.RETAIL,
        address: '45 Main St, Bangalore',
        status: CustomerStatus.LEAD,
        followUpDate: '2026-08-15T00:00:00.000Z',
        notes: 'Test note',
      };

      mockPrisma.customer.create.mockResolvedValue({ id: 'cust-uuid', ...customerData });

      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${salesToken}`)
        .send(customerData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBe('New Client');
    });
  });

  // 5 & 11. Create Product & Unique SKU
  describe('POST /api/products', () => {
    const productData = {
      productName: 'Gaming Mouse',
      sku: 'ELE-MS-999',
      category: 'Electronics',
      unitPrice: 1200,
      currentStock: 50,
      minimumStock: 10,
      warehouseLocation: 'Bin 4',
    };

    it('should create product and log initial stock IN movement', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({ id: 'prod-uuid', ...productData });
      mockPrisma.stockMovement.create.mockResolvedValue({ id: 'move-uuid' });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.product.create).toHaveBeenCalled();
      expect(mockPrisma.stockMovement.create).toHaveBeenCalled();
    });

    it('should reject duplicate SKU with 409', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'existing-id', sku: 'ELE-MS-999' });

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // 6 & 7. Stock IN & Stock OUT & 11. Non-Negative Stock
  describe('POST /api/products/:id/stock-movements', () => {
    const mockProduct = {
      id: 'prod-uuid',
      productName: 'Gaming Mouse',
      sku: 'ELE-MS-999',
      currentStock: 20,
      minimumStock: 5,
    };

    it('should adjust stock IN successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, currentStock: 30 });
      mockPrisma.stockMovement.create.mockResolvedValue({ id: 'm-id' });

      const res = await request(app)
        .post(`/api/products/${mockProduct.id}/stock-movements`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantityChanged: 10,
          movementType: MovementType.IN,
          reason: 'Received shipment',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.currentStock).toBe(30);
    });

    it('should adjust stock OUT successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, currentStock: 5 });
      mockPrisma.stockMovement.create.mockResolvedValue({ id: 'm-id' });

      const res = await request(app)
        .post(`/api/products/${mockProduct.id}/stock-movements`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantityChanged: 15,
          movementType: MovementType.OUT,
          reason: 'Sample demo given',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.currentStock).toBe(5);
    });

    it('should reject stock OUT that results in negative stock with 400', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const res = await request(app)
        .post(`/api/products/${mockProduct.id}/stock-movements`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantityChanged: 25, // product has only 20
          movementType: MovementType.OUT,
          reason: 'Exceeding sale',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Stock cannot be negative');
    });
  });

  // 8 & 12. Draft Challan does not reduce stock + Product snapshot stored
  describe('POST /api/challans (Create Draft)', () => {
    const validCustomerId = '11111111-1111-1111-1111-111111111111';
    const validProductId = '22222222-2222-2222-2222-222222222222';
    const mockCustomer = { id: validCustomerId, customerName: 'Client' };
    const mockProduct = {
      id: validProductId,
      productName: 'Desk Chair',
      sku: 'FUR-CH-001',
      unitPrice: 5000,
      currentStock: 10,
    };

    it('should create draft sales challan, store snapshots, and NOT reduce stock', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockSalesUser);
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.salesChallan.findFirst.mockResolvedValue(null); // for number generation

      mockPrisma.salesChallan.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'challan-uuid',
          challanNumber: args.data.challanNumber,
          customerId: args.data.customerId,
          totalQuantity: args.data.totalQuantity,
          status: ChallanStatus.DRAFT,
          items: args.data.items.create,
        });
      });

      const res = await request(app)
        .post('/api/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: validCustomerId,
          items: [{ productId: validProductId, quantity: 4 }],
        });

      expect(res.status).toBe(201);

      expect(res.body.data.status).toBe(ChallanStatus.DRAFT);

      // Verify Snapshot data is logged in the items object
      const firstItem = res.body.data.items[0];
      expect(firstItem.productNameSnapshot).toBe(mockProduct.productName);
      expect(firstItem.skuSnapshot).toBe(mockProduct.sku);
      expect(firstItem.unitPriceSnapshot).toBe(mockProduct.unitPrice);
      expect(firstItem.quantity).toBe(4);

      // Verify that no product stock update mock was called
      expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });
  });

  // 9. Confirmed Challan reduces stock
  // 10. Insufficient stock rejects transaction (atomic)
  describe('POST /api/challans/:id/confirm', () => {
    const mockChallan = {
      id: 'challan-uuid',
      challanNumber: 'CH-2026-00001',
      customerId: 'cust-uuid',
      status: ChallanStatus.DRAFT,
      items: [
        {
          productId: 'prod-1-uuid',
          productNameSnapshot: 'Desk',
          skuSnapshot: 'DSK-001',
          quantity: 5,
        },
      ],
    };

    const mockProductSufficient = {
      id: 'prod-1-uuid',
      productName: 'Desk',
      sku: 'DSK-001',
      currentStock: 10,
    };

    const mockProductInsufficient = {
      id: 'prod-1-uuid',
      productName: 'Desk',
      sku: 'DSK-001',
      currentStock: 3,
    };

    it('should reduce stock and log OUT movements when stock is sufficient', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockSalesUser);
      // Mock inside transaction chain
      mockPrisma.salesChallan.findUnique.mockResolvedValue(mockChallan);
      mockPrisma.product.findUnique.mockResolvedValue(mockProductSufficient);
      mockPrisma.product.update.mockResolvedValue({ ...mockProductSufficient, currentStock: 5 });
      mockPrisma.stockMovement.create.mockResolvedValue({ id: 'm-id' });
      mockPrisma.salesChallan.update.mockResolvedValue({ ...mockChallan, status: ChallanStatus.CONFIRMED });

      const res = await request(app)
        .post(`/api/challans/${mockChallan.id}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ChallanStatus.CONFIRMED);

      // Verify update occurred
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1-uuid' },
          data: { currentStock: 5 },
        })
      );
      // Verify OUT movement recorded
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1-uuid',
            quantityChanged: 5,
            movementType: MovementType.OUT,
          }),
        })
      );
    });

    it('should reject confirmation and abort transaction when stock is insufficient', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockSalesUser);
      mockPrisma.salesChallan.findUnique.mockResolvedValue(mockChallan);
      mockPrisma.product.findUnique.mockResolvedValue(mockProductInsufficient); // only 3 stock, challan requires 5

      const res = await request(app)
        .post(`/api/challans/${mockChallan.id}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Insufficient stock for product Desk');
      expect(res.body.error).toEqual({
        product: 'Desk',
        available: 3,
        requested: 5,
      });

      // Assert that NO update or movements were executed since transaction aborted
      expect(mockPrisma.product.update).not.toHaveBeenCalled();
      expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  // 13. Challan Number Generation Check
  describe('Challan Serial Number Generation', () => {
    const validCustomerId = '11111111-1111-1111-1111-111111111111';
    const validProductId = '22222222-2222-2222-2222-222222222222';
    const mockCustomer = { id: validCustomerId, customerName: 'Client' };
    const mockProduct = {
      id: validProductId,
      productName: 'Desk Chair',
      sku: 'FUR-CH-001',
      unitPrice: 5000,
      currentStock: 10,
    };

    it('should generate first serial number if no existing challans exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockSalesUser);
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.salesChallan.findFirst.mockResolvedValue(null);

      mockPrisma.salesChallan.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'challan-uuid',
          challanNumber: args.data.challanNumber,
          status: ChallanStatus.DRAFT,
        });
      });

      const res = await request(app)
        .post('/api/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: validCustomerId,
          items: [{ productId: validProductId, quantity: 2 }],
        });

      const currentYear = new Date().getFullYear();
      expect(res.status).toBe(201);
      expect(res.body.data.challanNumber).toBe(`CH-${currentYear}-00001`);
    });

    it('should increment existing serial numbers correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockSalesUser);
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const currentYear = new Date().getFullYear();
      mockPrisma.salesChallan.findFirst.mockResolvedValue({
        challanNumber: `CH-${currentYear}-00042`,
      });

      mockPrisma.salesChallan.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'challan-uuid-2',
          challanNumber: args.data.challanNumber,
          status: ChallanStatus.DRAFT,
        });
      });

      const res = await request(app)
        .post('/api/challans')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerId: validCustomerId,
          items: [{ productId: validProductId, quantity: 2 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.challanNumber).toBe(`CH-${currentYear}-00043`);
    });
  });

});
