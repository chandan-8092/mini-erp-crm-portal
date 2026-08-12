import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'System Admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: {},
    create: {
      email: 'sales@example.com',
      name: 'Sarah Sales',
      passwordHash: await bcrypt.hash('sales123', 10),
      role: Role.SALES,
    },
  });

  const warehouse = await prisma.user.upsert({
    where: { email: 'warehouse@example.com' },
    update: {},
    create: {
      email: 'warehouse@example.com',
      name: 'Willy Warehouse',
      passwordHash: await bcrypt.hash('warehouse123', 10),
      role: Role.WAREHOUSE,
    },
  });

  const accounts = await prisma.user.upsert({
    where: { email: 'accounts@example.com' },
    update: {},
    create: {
      email: 'accounts@example.com',
      name: 'Alex Accounts',
      passwordHash: await bcrypt.hash('accounts123', 10),
      role: Role.ACCOUNTS,
    },
  });

  console.log('Users seeded successfully:', {
    admin: admin.email,
    sales: sales.email,
    warehouse: warehouse.email,
    accounts: accounts.email,
  });

  // 2. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      customerName: 'Acme Corporates',
      mobileNumber: '9876543210',
      email: 'contact@acme.com',
      businessName: 'Acme Corp Pvt Ltd',
      gstNumber: '29ABCDE1234F1Z5',
      customerType: CustomerType.DISTRIBUTOR,
      address: '123 Industrial Area, Block A, Bangalore, India',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
      notes: 'Key distributor for South India region. Prefers bulk deliveries on weekends.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      customerName: 'Globals Retailers',
      mobileNumber: '9988776655',
      email: 'info@globalsretail.com',
      businessName: 'Globals Retail Outlet',
      gstNumber: '27GHIJK5678L2Z9',
      customerType: CustomerType.WHOLESALE,
      address: 'Sector 5, HSR Layout, Bangalore, India',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
      notes: 'Prompt payer. Frequently orders office supplies and electronic items.',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      customerName: 'John Doe',
      mobileNumber: '9000011111',
      email: 'john.doe@gmail.com',
      businessName: 'JD Consulting',
      gstNumber: null,
      customerType: CustomerType.RETAIL,
      address: 'Apartment 402, Green Glen Layout, Bangalore, India',
      status: CustomerStatus.LEAD,
      followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // tomorrow
      notes: 'Inquired about standing desks. Needs pricing sheet.',
    },
  });

  console.log('Customers seeded successfully.');

  // 3. Create Products
  const prod1 = await prisma.product.create({
    data: {
      productName: 'Ergonomic Office Chair',
      sku: 'FUR-CH-001',
      category: 'Furniture',
      unitPrice: 8500.0,
      currentStock: 45,
      minimumStock: 10,
      warehouseLocation: 'Ais-1-Row-3',
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      productName: 'Standing Desk Converter',
      sku: 'FUR-DK-002',
      category: 'Furniture',
      unitPrice: 12000.0,
      currentStock: 12,
      minimumStock: 5,
      warehouseLocation: 'Ais-1-Row-4',
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      productName: 'USB-C Hub Multiport',
      sku: 'ELE-HB-003',
      category: 'Electronics',
      unitPrice: 2450.0,
      currentStock: 150,
      minimumStock: 25,
      warehouseLocation: 'Ais-3-Row-1',
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      productName: 'Mechanical Keyboard Blue Switch',
      sku: 'ELE-KB-004',
      category: 'Electronics',
      unitPrice: 4200.0,
      currentStock: 8, // Low Stock! (min 15)
      minimumStock: 15,
      warehouseLocation: 'Ais-3-Row-2',
    },
  });

  const prod5 = await prisma.product.create({
    data: {
      productName: 'Vertical Wireless Mouse',
      sku: 'ELE-MS-005',
      category: 'Electronics',
      unitPrice: 1800.0,
      currentStock: 3, // Low Stock! (min 10)
      minimumStock: 10,
      warehouseLocation: 'Ais-3-Row-3',
    },
  });

  console.log('Products seeded successfully.');

  // 4. Create Stock Movements
  // Initial stock setups
  const products = [prod1, prod2, prod3, prod4, prod5];
  for (const p of products) {
    await prisma.stockMovement.create({
      data: {
        productId: p.id,
        quantityChanged: p.currentStock,
        movementType: MovementType.IN,
        reason: 'Initial Inventory Entry',
        createdBy: admin.id,
      },
    });
  }

  // Record an OUT movement for wireless mouse
  await prisma.product.update({
    where: { id: prod5.id },
    data: { currentStock: 3 }, // simulated starting stock was 3
  });
  // Log a stock OUT
  await prisma.stockMovement.create({
    data: {
      productId: prod5.id,
      quantityChanged: 5,
      movementType: MovementType.OUT,
      reason: 'Sample Demonstration Kit dispatched',
      createdBy: sales.id,
    },
  });

  console.log('Stock movements seeded successfully.');

  // 5. Create Sample Sales Challans
  // A confirmed challan
  const challan1 = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-00001',
      customerId: customer1.id,
      totalQuantity: 5,
      status: ChallanStatus.CONFIRMED,
      createdBy: sales.id,
      items: {
        create: [
          {
            productId: prod1.id,
            productNameSnapshot: prod1.productName,
            skuSnapshot: prod1.sku,
            unitPriceSnapshot: prod1.unitPrice,
            quantity: 3,
            subtotal: prod1.unitPrice * 3,
          },
          {
            productId: prod3.id,
            productNameSnapshot: prod3.productName,
            skuSnapshot: prod3.sku,
            unitPriceSnapshot: prod3.unitPrice,
            quantity: 2,
            subtotal: prod3.unitPrice * 2,
          },
        ],
      },
    },
  });

  // A draft challan
  await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-00002',
      customerId: customer2.id,
      totalQuantity: 10,
      status: ChallanStatus.DRAFT,
      createdBy: sales.id,
      items: {
        create: [
          {
            productId: prod3.id,
            productNameSnapshot: prod3.productName,
            skuSnapshot: prod3.sku,
            unitPriceSnapshot: prod3.unitPrice,
            quantity: 10,
            subtotal: prod3.unitPrice * 10,
          },
        ],
      },
    },
  });

  // 6. Follow-up History
  await prisma.followUp.create({
    data: {
      customerId: customer1.id,
      note: 'Called manager to discuss South Region distributor discount model. They requested a discount chart.',
      followUpDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      createdBy: sales.id,
    },
  });

  await prisma.followUp.create({
    data: {
      customerId: customer3.id,
      note: 'Lead created. Expressed interest in Ergonomic chair and Standing Desk options.',
      followUpDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
      createdBy: sales.id,
    },
  });

  console.log('Seeding complete. All structures populated successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
