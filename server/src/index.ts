import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config/env.js';
import { getDb, saveDb } from './db/database.js';
import { ensureDatabaseInitialized } from './db/init.js';
import { pdfGeneratorService } from './services/pdfGeneratorService.js';
import { geminiAssistantService } from './services/geminiService.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import institutionRoutes from './routes/institutionRoutes.js';
import fdrRoutes from './routes/fdrRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import duplicateRoutes from './routes/duplicateRoutes.js';
import riskRoutes from './routes/riskRoutes.js';
import worklistRoutes from './routes/worklistRoutes.js';
import maturityRoutes from './routes/maturityRoutes.js';
import renewalRoutes from './routes/renewalRoutes.js';
import releaseRoutes from './routes/releaseRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import configRoutes from './routes/configRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Dynamic production CORS configuration
const allowedOrigins = [
  config.clientOrigin,
  process.env.FRONTEND_URL,
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
].filter(Boolean).flatMap(o => (o as string).split(',').map(s => s.trim()));

app.use(cors({
  origin: (requestOrigin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!requestOrigin) return callback(null, true);

    // Exact match in allowed origins list
    if (allowedOrigins.includes(requestOrigin)) {
      return callback(null, true);
    }

    // Allow Vercel or Render preview domains
    if (/^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$/.test(requestOrigin) ||
        /^https:\/\/([a-zA-Z0-9_-]+\.)?onrender\.com$/.test(requestOrigin)) {
      return callback(null, true);
    }

    // If development mode, permit any localhost origin
    if (config.nodeEnv !== 'production' && requestOrigin.includes('localhost')) {
      return callback(null, true);
    }

    console.warn(`[CORS Blocked] Origin not in allowed whitelist: ${requestOrigin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'FDR SecureTrack Backend API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
    database: 'SQLITE_SQLJS_ACTIVE',
    geminiConfigured: geminiAssistantService.isConfigured()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/fdrs', fdrRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/duplicates', duplicateRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/worklist', worklistRoutes);
app.use('/api/maturity', maturityRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/release', releaseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/config', configRoutes);
app.use('/api/users', userRoutes);

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Serve frontend static build if available
const clientDist = path.resolve(process.cwd(), '../client/dist');
const altClientDist = path.resolve(process.cwd(), 'client/dist');
const distPath = fs.existsSync(clientDist) ? clientDist : (fs.existsSync(altClientDist) ? altClientDist : null);

if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Initialize database and start HTTP server
async function startServer() {
  try {
    // Ensure database tables, indexes, and initial seeds are present without data loss
    await ensureDatabaseInitialized();
    console.log('--- Connected & Initialized SQLite Database (fdr_securetrack.db) ---');

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`  FDR SecureTrack API Server running on port ${config.port}`);
      console.log(`  Health Check: http://0.0.0.0:${config.port}/api/health`);
      console.log(`  Mode: ${config.nodeEnv}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown to persist database
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down. Persisting database...');
  saveDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received. Persisting database...');
  saveDb();
  process.exit(0);
});

startServer();
