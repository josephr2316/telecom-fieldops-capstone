import app from './infra/app';
import { env } from './config/env';
import { logger } from './infra/logger/logger';
import { prisma } from './infra/db/prisma/prismaClient';

const PORT = env.PORT;

app.listen(PORT, async () => {
  logger.info({ correlationId: 'bootstrap', action: 'STARTUP', port: PORT }, 'API started');
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info({ correlationId: 'bootstrap', action: 'DB_PING' }, 'Database connection OK');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn(
      { correlationId: 'bootstrap', action: 'DB_PING_FAIL', error: msg },
      'Database ping failed at startup (first request may fail)',
    );
  }
});

export default app;
