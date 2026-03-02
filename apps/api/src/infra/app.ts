import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import { correlationId } from '../middleware/correlationId';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { sanitizeResponseMiddleware } from '../middleware/sanitize';
import { buildApiRouter } from './routes';

function loadOpenApiSpec(): object {
  const possiblePaths = [
    path.join(__dirname, '..', 'openapi', 'openapi.yaml'),
    path.join(process.cwd(), 'src', 'openapi', 'openapi.yaml'),
  ];
  let spec: Record<string, unknown> = {};
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      spec = (yaml.load(raw) as Record<string, unknown>) || {};
      break;
    }
  }
  if (!spec.openapi) {
    spec = { openapi: '3.1.0', info: { title: 'Telecom FieldOps API', version: '1.0.0' }, paths: {} };
  }
  // Servers para "Try it out": si hay API_PUBLIC_URL (producción) usarla; si no, misma origen (/api/v1) para que funcione en local y prod sin config
  const baseUrl = process.env.API_PUBLIC_URL;
  if (baseUrl && typeof baseUrl === 'string') {
    spec.servers = [{ url: baseUrl.replace(/\/$/, '') + '/api/v1' }];
  } else {
    spec.servers = [{ url: '/api/v1' }];
  }
  return spec;
}

export function createApp() {
  const app = express();
  // Required behind reverse proxy (Railway, Heroku, etc.): rate-limit needs correct client IP from X-Forwarded-For
  app.set('trust proxy', 1);
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

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(loadOpenApiSpec(), { explorer: true }));

  app.use('/api/v1', buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler());

  return app;
}

const app = createApp();

export default app;
