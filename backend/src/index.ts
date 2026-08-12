import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Base route healthcheck
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Mini ERP + CRM API Service',
    timestamp: new Date(),
  });
});

// Fallback 404 handler for unmatched routes
app.use((req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[ERP-CRM Server]: Running on port ${PORT}`);
    console.log(`[ERP-CRM Server]: Allowed CORS origin is ${FRONTEND_URL}`);
  });
}


export default app;

