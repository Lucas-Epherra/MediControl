import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

/** Configuración compartida por main.ts y los tests e2e. */
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
}
