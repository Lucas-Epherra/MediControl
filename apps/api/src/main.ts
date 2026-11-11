import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  setupApp(app);
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
  });

  const swagger = new DocumentBuilder()
    .setTitle('MediControl API')
    .setDescription('Coordinación de la medicación de un adulto mayor entre cuidadores')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  Logger.log(`API en http://localhost:${port}/api · Swagger en http://localhost:${port}/docs`);
}

void bootstrap();
