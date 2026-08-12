import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const MOCK_DB = process.env.MOCK_DB === 'true';

// Pre-calculated bcrypt hash for 'password123'
const passwordHash = '$2b$10$MRYYhn0RsjBn.IYekthGeO7eaIXUY7WJ.yBEHCO4RXsl2NgPQ96kS';

class MemoryTable {
  public items: any[] = [];
  constructor(initialItems: any[] = []) {
    this.items = [...initialItems];
  }

  async findMany(args?: any) {
    let result = [...this.items];

    if (args?.where) {
      result = result.filter(item => matchWhere(item, args.where));
    }

    if (args?.orderBy) {
      const keys = Object.keys(args.orderBy);
      if (keys.length > 0) {
        const key = keys[0];
        const dir = args.orderBy[key] === 'desc' ? -1 : 1;
        result.sort((a: any, b: any) => {
          if (a[key] < b[key]) return -1 * dir;
          if (a[key] > b[key]) return 1 * dir;
          return 0;
        });
      }
    }

    if (args?.skip !== undefined) {
      result = result.slice(args.skip);
    }
    if (args?.take !== undefined) {
      result = result.slice(0, args.take);
    }

    if (args?.include) {
      result = result.map(item => resolveIncludes(item, args.include));
    }

    return result;
  }

  async findUnique(args: any) {
    const where = args.where;
    const match = this.items.find(item => matchWhere(item, where));
    if (!match) return null;
    if (args.include) {
      return resolveIncludes(match, args.include);
    }
    return { ...match };
  }

  async findFirst(args: any) {
    let result = [...this.items];
    if (args?.where) {
      result = result.filter(item => matchWhere(item, args.where));
    }
    if (result.length === 0) return null;
    const match = result[0];
    if (args?.include) {
      return resolveIncludes(match, args.include);
    }
    return { ...match };
  }

  async count(args?: any) {
    let result = [...this.items];
    if (args?.where) {
      result = result.filter(item => matchWhere(item, args.where));
    }
    return result.length;
  }

  async create(args: any) {
    const data = { ...args.data };
    const id = data.id || crypto.randomUUID();
    
    // Check nested creations (e.g. items in salesChallan)
    let nestedItems: any[] = [];
    if (data.items?.create) {
      if (Array.isArray(data.items.create)) {
        nestedItems = data.items.create;
      } else {
        nestedItems = [data.items.create];
      }
      delete data.items;
    }

    const newItem = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };

    this.items.push(newItem);

    // Save nested items
    for (const subItem of nestedItems) {
      dbStore.salesChallanItem.items.push({
        id: crypto.randomUUID(),
        challanId: id,
        ...subItem
      });
    }

    return newItem;
  }

  async update(args: any) {
    const where = args.where;
    const data = { ...args.data };

    const index = this.items.findIndex(item => matchWhere(item, where));
    if (index === -1) throw new Error('Record not found');

    // Check nested creates inside updates
    let nestedItems: any[] = [];
    if (data.items?.create) {
      if (Array.isArray(data.items.create)) {
        nestedItems = data.items.create;
      } else {
        nestedItems = [data.items.create];
      }
      delete data.items;
    }

    const updated = {
      ...this.items[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.items[index] = updated;

    // Save nested items
    const id = this.items[index].id;
    for (const subItem of nestedItems) {
      dbStore.salesChallanItem.items.push({
        id: crypto.randomUUID(),
        challanId: id,
        ...subItem
      });
    }

    return updated;
  }

  async upsert(args: any) {
    const where = args.where;
    const createData = args.create;
    const updateData = args.update;
    const match = this.items.find(item => matchWhere(item, where));
    if (match) {
      return this.update({ where, data: updateData });
    } else {
      return this.create({ data: createData });
    }
  }

  async delete(args: any) {
    const where = args.where;
    const index = this.items.findIndex(item => matchWhere(item, where));
    if (index === -1) throw new Error('Record not found');
    const deleted = this.items[index];
    this.items.splice(index, 1);
    return deleted;
  }

  async deleteMany(args?: any) {
    if (args?.where) {
      this.items = this.items.filter(item => !matchWhere(item, args.where));
    } else {
      this.items = [];
    }
    return { count: this.items.length };
  }
}

function matchWhere(item: any, where: any): boolean {
  if (!where) return true;
  for (const key of Object.keys(where)) {
    const condition = where[key];
    if (key === 'OR' && Array.isArray(condition)) {
      return condition.some(subWhere => matchWhere(item, subWhere));
    }
    if (key === 'AND' && Array.isArray(condition)) {
      return condition.every(subWhere => matchWhere(item, subWhere));
    }
    if (key === 'product') {
      const product = dbStore.product.items.find((p: any) => p.id === item.productId);
      if (!product) return false;
      return matchWhere(product, condition);
    }
    const val = item[key];
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      if ('contains' in condition) {
        const needle = condition.contains.toLowerCase();
        const haystack = (val || '').toString().toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if ('mode' in condition && Object.keys(condition).length === 2 && 'contains' in condition) {
        // mode: 'insensitive' is handled by using toLowerCase() above
      }
      if ('lte' in condition) {
        if (val > condition.lte) return false;
      }
      if ('gte' in condition) {
        if (val < condition.gte) return false;
      }
    } else {
      if (val !== condition) return false;
    }
  }
  return true;
}

function resolveIncludes(item: any, include: any): any {
  const resolved = { ...item };
  for (const relation of Object.keys(include)) {
    if (!include[relation]) continue;
    if (relation === 'followUps') {
      resolved.followUps = dbStore.followUp.items
        .filter((f: any) => f.customerId === item.id)
        .map((f: any) => resolveIncludes(f, include[relation].include || { creator: true }));
    }
    if (relation === 'challans') {
      resolved.challans = dbStore.salesChallan.items
        .filter((c: any) => c.customerId === item.id)
        .map((c: any) => resolveIncludes(c, include[relation].include || {}));
    }
    if (relation === 'product') {
      resolved.product = dbStore.product.items.find((p: any) => p.id === item.productId);
    }
    if (relation === 'creator') {
      resolved.creator = dbStore.user.items.find((u: any) => u.id === (item.createdBy || item.userId));
    }
    if (relation === 'customer') {
      resolved.customer = dbStore.customer.items.find((c: any) => c.id === item.customerId);
    }
    if (relation === 'items') {
      resolved.items = dbStore.salesChallanItem.items.filter((i: any) => i.challanId === item.id);
    }
  }
  return resolved;
}

const dbStore: any = {
  user: new MemoryTable([
    { id: 'usr-admin', email: 'admin@example.com', name: 'System Admin', passwordHash, role: 'ADMIN' },
    { id: 'usr-sales', email: 'sales@example.com', name: 'Sarah Sales', passwordHash, role: 'SALES' },
    { id: 'usr-warehouse', email: 'warehouse@example.com', name: 'Willy Warehouse', passwordHash, role: 'WAREHOUSE' },
    { id: 'usr-accounts', email: 'accounts@example.com', name: 'Alex Accounts', passwordHash, role: 'ACCOUNTS' },
  ]),
  customer: new MemoryTable([
    {
      id: '11111111-1111-1111-1111-111111111111',
      customerName: 'Acme Corporates',
      mobileNumber: '9876543210',
      email: 'contact@acme.com',
      businessName: 'Acme Corp Pvt Ltd',
      gstNumber: '29ABCDE1234F1Z5',
      customerType: 'DISTRIBUTOR',
      address: '123 Industrial Area, Block A, Bangalore, India',
      status: 'ACTIVE',
      followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
      notes: 'Key distributor for South India region. Prefers bulk deliveries on weekends.',
    },
    {
      id: '11111111-1111-1111-1111-222222222222',
      customerName: 'Globals Retailers',
      mobileNumber: '9988776655',
      email: 'info@globalsretail.com',
      businessName: 'Globals Retail Outlet',
      gstNumber: '27GHIJK5678L2Z9',
      customerType: 'WHOLESALE',
      address: 'Sector 5, HSR Layout, Bangalore, India',
      status: 'ACTIVE',
      followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      notes: 'Prompt payer. Frequently orders office supplies and electronic items.',
    },
    {
      id: '11111111-1111-1111-1111-333333333333',
      customerName: 'John Doe',
      mobileNumber: '9000011111',
      email: 'john.doe@gmail.com',
      businessName: 'JD Consulting',
      gstNumber: null,
      customerType: 'RETAIL',
      address: 'Apartment 402, Green Glen Layout, Bangalore, India',
      status: 'LEAD',
      followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(),
      notes: 'Inquired about standing desks. Needs pricing sheet.',
    },
  ]),
  product: new MemoryTable([
    {
      id: '22222222-2222-2222-2222-111111111111',
      productName: 'Ergonomic Office Chair',
      sku: 'FUR-CH-001',
      category: 'Furniture',
      unitPrice: 8500.0,
      currentStock: 45,
      minimumStock: 10,
      warehouseLocation: 'Ais-1-Row-3',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      productName: 'Standing Desk Converter',
      sku: 'FUR-DK-002',
      category: 'Furniture',
      unitPrice: 12000.0,
      currentStock: 12,
      minimumStock: 5,
      warehouseLocation: 'Ais-1-Row-4',
    },
    {
      id: '22222222-2222-2222-2222-333333333333',
      productName: 'USB-C Hub Multiport',
      sku: 'ELE-HB-003',
      category: 'Electronics',
      unitPrice: 2450.0,
      currentStock: 150,
      minimumStock: 25,
      warehouseLocation: 'Ais-3-Row-1',
    },
    {
      id: '22222222-2222-2222-2222-444444444444',
      productName: 'Mechanical Keyboard Blue Switch',
      sku: 'ELE-KB-004',
      category: 'Electronics',
      unitPrice: 4200.0,
      currentStock: 8,
      minimumStock: 15,
      warehouseLocation: 'Ais-3-Row-2',
    },
    {
      id: '22222222-2222-2222-2222-555555555555',
      productName: 'Vertical Wireless Mouse',
      sku: 'ELE-MS-005',
      category: 'Electronics',
      unitPrice: 1800.0,
      currentStock: 3,
      minimumStock: 10,
      warehouseLocation: 'Ais-3-Row-3',
    },
  ]),
  stockMovement: new MemoryTable([
    { id: '66666666-6666-6666-6666-111111111111', productId: '22222222-2222-2222-2222-111111111111', quantityChanged: 45, movementType: 'IN', reason: 'Initial Inventory Entry', createdBy: 'usr-admin' },
    { id: '66666666-6666-6666-6666-222222222222', productId: '22222222-2222-2222-2222-222222222222', quantityChanged: 12, movementType: 'IN', reason: 'Initial Inventory Entry', createdBy: 'usr-admin' },
    { id: '66666666-6666-6666-6666-333333333333', productId: '22222222-2222-2222-2222-333333333333', quantityChanged: 150, movementType: 'IN', reason: 'Initial Inventory Entry', createdBy: 'usr-admin' },
    { id: '66666666-6666-6666-6666-444444444444', productId: '22222222-2222-2222-2222-444444444444', quantityChanged: 8, movementType: 'IN', reason: 'Initial Inventory Entry', createdBy: 'usr-admin' },
    { id: '66666666-6666-6666-6666-555555555555', productId: '22222222-2222-2222-2222-555555555555', quantityChanged: 8, movementType: 'IN', reason: 'Initial Inventory Entry', createdBy: 'usr-admin' },
    { id: '66666666-6666-6666-6666-666666666666', productId: '22222222-2222-2222-2222-555555555555', quantityChanged: 5, movementType: 'OUT', reason: 'Sample Demonstration Kit dispatched', createdBy: 'usr-sales' },
  ]),
  salesChallan: new MemoryTable([
    { id: '33333333-3333-3333-3333-111111111111', challanNumber: 'CH-2026-00001', customerId: '11111111-1111-1111-1111-111111111111', totalQuantity: 5, status: 'CONFIRMED', createdBy: 'usr-sales' },
    { id: '33333333-3333-3333-3333-222222222222', challanNumber: 'CH-2026-00002', customerId: '11111111-1111-1111-1111-222222222222', totalQuantity: 10, status: 'DRAFT', createdBy: 'usr-sales' },
  ]),
  salesChallanItem: new MemoryTable([
    { id: '44444444-4444-4444-4444-111111111111', challanId: '33333333-3333-3333-3333-111111111111', productId: '22222222-2222-2222-2222-111111111111', productNameSnapshot: 'Ergonomic Office Chair', skuSnapshot: 'FUR-CH-001', unitPriceSnapshot: 8500.0, quantity: 3, subtotal: 25500.0 },
    { id: '44444444-4444-4444-4444-222222222222', challanId: '33333333-3333-3333-3333-111111111111', productId: '22222222-2222-2222-2222-333333333333', productNameSnapshot: 'USB-C Hub Multiport', skuSnapshot: 'ELE-HB-003', unitPriceSnapshot: 2450.0, quantity: 2, subtotal: 4900.0 },
    { id: '44444444-4444-4444-4444-333333333333', challanId: '33333333-3333-3333-3333-222222222222', productId: '22222222-2222-2222-2222-333333333333', productNameSnapshot: 'USB-C Hub Multiport', skuSnapshot: 'ELE-HB-003', unitPriceSnapshot: 2450.0, quantity: 10, subtotal: 24500.0 },
  ]),
  followUp: new MemoryTable([
    { id: '55555555-5555-5555-5555-111111111111', customerId: '11111111-1111-1111-1111-111111111111', note: 'Called manager to discuss South Region distributor discount model. They requested a discount chart.', followUpDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), createdBy: 'usr-sales' },
    { id: '55555555-5555-5555-5555-222222222222', customerId: '11111111-1111-1111-1111-333333333333', note: 'Lead created. Expressed interest in Ergonomic chair and Standing Desk options.', followUpDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), createdBy: 'usr-sales' },
  ]),
};

const mockPrisma: any = {
  user: dbStore.user,
  customer: dbStore.customer,
  product: dbStore.product,
  stockMovement: dbStore.stockMovement,
  salesChallan: dbStore.salesChallan,
  salesChallanItem: dbStore.salesChallanItem,
  followUp: dbStore.followUp,
  $transaction: async (callback: any) => {
    return callback(mockPrisma);
  },
  $disconnect: async () => {},
};

const prisma = (MOCK_DB ? mockPrisma : new PrismaClient()) as PrismaClient;

export default prisma;

