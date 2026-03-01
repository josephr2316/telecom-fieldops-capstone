import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { correlationId } from '../middleware/correlationId';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { sanitizeResponseMiddleware } from '../middleware/sanitize';
import { buildApiRouter } from './routes';

export function createApp() {
  const app = express();
  app.use(helmet());
  // Normalize multiple slashes in path so /api/v1//catalog/plans becomes /api/v1/catalog/plans
  app.use((req, _res, next) => {
    const [path, qs] = (req.url || '').split('?');
    if (path.includes('//')) {
      req.url = path.replace(/\/+/g, '/') + (qs ? `?${qs}` : '');
    }
    next();
  });
  // CORS abierto: acepta cualquier origen (útil para desarrollo y pruebas desde cualquier front)
  app.use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
      credentials: true,
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(correlationId());
  app.use(sanitizeResponseMiddleware);

  app.use('/api/v1', buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler());

  return app;
}

const app = createApp();

export default app;
