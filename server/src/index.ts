import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config/env.js';
import { getDb, saveDb } from './db/database.js';
import { pdfGeneratorService } from './services/pdfGeneratorService.js';

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

// Middleware
app.use(cors({
  origin: [config.clientOrigin, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'FDR SecureTrack Backend API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
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
    await getDb();
    console.log('--- Connected to SQLite Database (fdr_securetrack.db) ---');

    // Preload and verify that all FDR documents exist on disk and in database
    const preloadedCount = await pdfGeneratorService.ensureSeededDocumentsExist();
    if (preloadedCount > 0) {
      console.log(`--- Preloaded ${preloadedCount} synthetic FDR documents ---`);
      saveDb();
    }

    app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`  FDR SecureTrack API Server running on port ${config.port}`);
      console.log(`  Health Check: http://localhost:${config.port}/api/health`);
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
