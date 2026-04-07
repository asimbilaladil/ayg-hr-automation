import './config/env'; // Validate env vars first
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './swagger/setup';

import candidateRoutes from './routes/candidates';
import appointmentRoutes from './routes/appointments';
import availabilityRoutes from './routes/availability';
import userRoutes from './routes/users';

const app = express();

// ── Security & logging ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' })); // transcripts can be large
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── API Docs ─────────────────────────────────────────────────────────────────
setupSwagger(app);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/candidates', candidateRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', userRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  console.log(`✅ HR Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`📚 Swagger docs: http://localhost:${env.PORT}/api/docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    const { prisma } = await import('./lib/prisma');
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
