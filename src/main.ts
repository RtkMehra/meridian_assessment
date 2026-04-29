import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

function validateEnvironment(isProduction: boolean): void {
  const required = ['DB_HOST', 'JWT_SECRET', 'ENCRYPTION_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    if (isProduction) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    new Logger('Bootstrap').warn(`Missing env vars (dev only): ${missing.join(', ')}`);
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';
  const adapter = new FastifyAdapter({
    logger: true,
    ignoreTrailingSlash: true,
  });

  validateEnvironment(isProduction);

  await adapter.register(helmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        styleSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  });

  const corsOrigin = process.env.CORS_ORIGIN || (isProduction ? '' : 'http://localhost:3000');

  if (isProduction && !corsOrigin) {
    throw new Error('CORS_ORIGIN must be set in production when credentials are enabled');
  }

  await adapter.register(fastifyCors as any, {
    origin: corsOrigin ? corsOrigin.split(',') : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await adapter.register(rateLimit as any, {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('MeridianSquare Backend')
    .setDescription('Backend API for asset tokenization platform')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('kyc', 'KYC verification')
    .addTag('assets', 'Asset registry')
    .addTag('blockchain', 'Blockchain tokenization')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT || '3000');
  await app.listen(port, '0.0.0.0');

  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`API docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
