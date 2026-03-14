import 'express-async-errors';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import videoRoutes from './routes/video.routes';
import feedRoutes from './routes/feed.routes';
import commentRoutes from './routes/comment.routes';
import searchRoutes from './routes/search.routes';
import hashtagRoutes from './routes/hashtag.routes';
import discoveryRoutes from './routes/discovery.routes';
import conversationRoutes from './routes/conversation.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';
import creatorRoutes from './routes/creator.routes';
import watchHistoryRoutes from './routes/watch-history.routes';
import reportRoutes from './routes/report.routes';
import soundRoutes from './routes/sound.routes';
import uploadRoutes from './routes/upload.routes';
import adminRoutes from './routes/admin.routes';
import tippingVideoRoutes from './routes/tipping.routes';
import { WebSocketService } from './services/websocket.service';
import { generalRateLimiter } from './middleware/rate-limit.middleware';
import { httpMetricsMiddleware, metricsHandler } from './metrics/http-metrics.middleware';
import { startBullMqMetrics } from './metrics/bullmq.metrics';
// Import to initialize workers and scheduled jobs
import './queues/video-processing.queue';
import { scheduleShelbyExpirationJob } from './queues/shelby-expiration.queue';

// Load environment variables
dotenv.config();

const app: express.Application = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression()); // Compress responses
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));
app.use(generalRateLimiter); // 100 req/min per IP
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Metrics should measure the full request lifecycle; register after parsers
app.use(httpMetricsMiddleware);

// Expose Prometheus metrics endpoint
app.get('/metrics', metricsHandler);

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/videos', videoRoutes);
app.use('/feed', feedRoutes);
app.use('/comments', commentRoutes);
app.use('/search', searchRoutes);
app.use('/hashtags', hashtagRoutes);
app.use('/discover', discoveryRoutes);
app.use('/conversations', conversationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/creator', creatorRoutes);
app.use('/watch-history', watchHistoryRoutes);
app.use('/reports', reportRoutes);
app.use('/sounds', soundRoutes);
app.use('/uploads', uploadRoutes);
app.use('/admin', adminRoutes);
app.use('/videos', tippingVideoRoutes);

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Video processing worker is already initialized when imported
    logger.info('✅ Video processing worker initialized');

    // Schedule daily Shelby blob expiration/renewal job
    await scheduleShelbyExpirationJob();
    logger.info('✅ Shelby expiration job scheduled');
    
    // Initialize WebSocket service
    const wsService = new WebSocketService(httpServer);
    // Set global WebSocket service for notification service
    const { setWebSocketService } = await import('./services/websocket.service');
    setWebSocketService(wsService);
    logger.info('✅ WebSocket server initialized');
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔌 WebSocket available at ws://localhost:${PORT}/socket.io`);
    });

    // Start BullMQ metrics collector (queue length + durations)
    startBullMqMetrics({ queueName: 'video-processing' });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
