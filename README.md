# Mini ERP + CRM Operations Portal (Production-Quality Full Stack Case Study)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-brightgreen?style=for-the-badge)](https://mini-erp-crm-portal-beta.vercel.app)
[![API Status](https://img.shields.io/badge/API%20Status-Render-blue?style=for-the-badge)](https://mini-erp-crm-backend-fucz.onrender.com)

A high-performance, secure, role-restricted **Mini ERP + CRM Operations Portal** built for a wholesale/distribution enterprise. It manages customer leads, product catalogs, physical inventory adjustments, and draft-to-execution sales workflows.

---

## 1. Architectural Stack

### Backend
* **Runtime**: Node.js & TypeScript
* **Framework**: Express.js
* **ORM**: Prisma Client with PostgreSQL (seeded with sample datasets)
* **Authentication**: JSON Web Token (JWT) stateless session tracking
* **Security**: `bcrypt` (10 rounds password hashing), `cors`, `helmet` (HTTP headers security)
* **Validations**: `zod` schema validator middleware
* **Testing Suite**: `Jest` & `Supertest` integration assertions (100% mock-based database isolation)

### Frontend
* **Core**: React 19, TypeScript, Vite
* **Routing**: React Router DOM (Declarative route paths and nested guard layouts)
* **Styling**: Tailwind CSS (Dark-themed premium interface, custom layouts)
* **State & Forms**: Axios HTTP Client (equipped with authorization headers attachment and automatic session-expiry 401 logouts), React Contexts

---

## 2. Directory Layout & Monorepo Structure

```bash
├── backend/                  # Node Express API
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL schemas, indices, and enums
│   │   └── seed.ts           # Demo profiles and catalog seed scripts
│   ├── src/
│   │   ├── config/           # Database clients exports
│   │   ├── controllers/      # Sales, Inventory, and CRM business controller handlers
│   │   ├── middleware/       # Auth guards, role permissions, and global error handlers
│   │   ├── routes/           # REST endpoints
│   │   ├── tests/            # Jest integration files
│   │   ├── validators/       # Zod validation schemas
│   │   └── index.ts          # Express bootstrapping
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/                 # React Client App
│   ├── src/
│   │   ├── components/       # Reusable layout guards & banners
│   │   ├── contexts/         # Authentication provider
│   │   ├── layouts/          # Responsive side nav layout shells
│   │   ├── pages/            # CRM details, stock movements, and challan details
│   │   ├── services/         # Axios global config
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Router wiring
│   │   └── main.tsx          # Rendering bootstrapper
│   ├── tsconfig.json
│   └── package.json
│
├── Postman_Collection.json   # Full API endpoints list with token script helpers
└── README.md                 # Project Overview Document
```

---

## 3. Database Schema Overview

The database utilizes standard PostgreSQL relations mapped with indexes for fast retrievals:
1. **User**: Internal employee record storing email, hashed password, and role enums (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
2. **Customer**: CRM customer record tracking type (`RETAIL`, `WHOLESALE`, `DISTRIBUTOR`), status (`LEAD`, `ACTIVE`, `INACTIVE`), address, and followup timestamps.
3. **FollowUp**: Timeline logs relating to a specific customer, registered by sales users.
4. **Product**: Catalog inventory tracker containing SKU (unique code index), prices, stock levels, safety thresholds, and warehouse location.
5. **StockMovement**: Stock audit trail tracking movement types (`IN`, `OUT`) and text reasons for manuals corrections or dispatches.
6. **SalesChallan**: Sales orders tracking status (`DRAFT`, `CONFIRMED`, `CANCELLED`).
7. **SalesChallanItem**: Individual products inside a challan, storing snapshot fields (`productNameSnapshot`, `skuSnapshot`, `unitPriceSnapshot`) to lock historical prices.

---

## 4. Role Permission Matrix

| Role | CRM Leads View | CRM Leads Edit / Create | Product Catalog View | Product CRUD / Stock Adjust | Sales Challan Create (Draft) | Confirm / Cancel Challan | Audit Trails View |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SALES** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **WAREHOUSE** | ❌ | ❌ | ✅ | ✅ | ✅ (View) | ✅ (Confirm only) | ✅ |
| **ACCOUNTS** | ✅ | ❌ | ✅ | ❌ | ✅ (View) | ❌ | ❌ |

---

## 5. Seed Test Credentials

All seeded accounts share the password: **`password123`**

* **Admin**: `admin@example.com` (Full system controls)
* **Sales Coordinator**: `sales@example.com` (Leads followups, draft orders, confirmation execution)
* **Warehouse Manager**: `warehouse@example.com` (Catalog management, manual stock adjustments, audits, dispatches)
* **Accounts Specialist**: `accounts@example.com` (Customer profiles reviews, invoice summaries audit)

---

## 6. Installation & Configuration

### Prerequisites
* Node.js (v18+)
* npm (v9+)

### Environment Configurations
Create `.env` files in both directories according to the `.env.example` templates:

#### Backend Config (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://username:password@localhost:5432/erpdb?schema=public"
JWT_SECRET="super-secure-jwt-secret-key"
NODE_ENV=development
```

#### Frontend Config (`frontend/.env`)
```env
VITE_API_URL="http://localhost:5000"
```

---

## 7. Starting the Application

### 1. Database Seeding (Backend)
Generate the Prisma Client and seed the initial schema datasets:
```bash
cd backend
npx prisma generate
npm run seed
```

### 2. Run Backend Dev Server
Starts the Express API server on `http://localhost:5000`:
```bash
cd backend
npm run dev
```

### 3. Run Jest Unit & Integration Tests
Runs the suite of mocks-isolated test cases checking auth limits, permissions, transactions, stock allocations, and pricing snaplocks:
```bash
cd backend
npm run test
```

### 4. Run Frontend client
Starts the Vite React developer hot-reloading server on `http://localhost:5173`:
```bash
cd frontend
npm run dev
```

---

## 8. Key Transaction & Pricing Snapshot Logic

### Pricing Lock Protection
When an order item is added to a Sales Challan, its name, SKU, and unit price are snapshotted into the `SalesChallanItem` record. If the product's catalog details or prices are updated later, historical invoices remain unchanged, ensuring consistent financial auditing.

### Atomic Confirmation Check
Challan confirmation runs inside a database transaction block:
1. It queries current stock for all items.
2. It verifies that `currentStock >= quantity` for all products in the order.
3. If **any** product falls short, the entire confirmation fails and the transaction is aborted (returns HTTP 400 with details about the stock gap).
4. If all items are sufficient, the stock is decremented, the status is changed to `CONFIRMED`, and a corresponding `OUT` stock movement log is generated for each item.

### Stock Restores on Cancellation
If a `CONFIRMED` sales challan is cancelled:
1. It loops through all items in the challan.
2. It restores the quantities back to each product's `currentStock`.
3. It writes an `IN` stock movement record with the reason: `Sales Challan <number> Cancellation Reversal`.
4. The status is set to `CANCELLED`.
