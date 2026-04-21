import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DatabaseInitService } from './common/services/database-init.service';
import { PaymentsService } from './modules/payments/payments.service';
import * as express from 'express';
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


  // Trust proxy to get real client IP from headers (X-Forwarded-For, etc.)
  // Required when running behind Docker, nginx, Vercel, or other proxies
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // Initialize database before app starts (migrations, seeding - SEEDING TEMPORARILY DISABLED)
  // This ensures database is ready before any service tries to use it
  try {
    const databaseInitService = app.get(DatabaseInitService);
    await databaseInitService.onModuleInit();

  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }

  // CORS configuration
  const defaultOrigins = [
    'https://sales.keanuresidences.com',
    'https://www.keanuresidences.com',
    'https://view.staging.keanuresidences.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4000',
    'http://192.168.1.28:3000/',
    'http://192.168.1.33:3000/',
    'https://api.hypelaunch.pathtech.net',
    'https://keanu-frontend-rho.vercel.app',
    'https://keanuresidence-production.up.railway.app',
    'https://keanu-residence.vercel.app',
    'https://main.d2sgt20asslqi9.amplifyapp.com'
  ];

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : [];

  // Automatically include FRONTEND_URL if it's set
  const frontendUrl = process.env.FRONTEND_URL;
  const frontendOrigins = frontendUrl ? [frontendUrl.trim()] : [];

  // Merge default origins with environment origins and frontend URL (avoid duplicates)
  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins, ...frontendOrigins])];

  console.log('CORS allowed origins:', allowedOrigins);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          console.warn(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Authorization'],
    maxAge: 86400, // 24 hours
  });

  // Enable cookie parser middleware
  app.use(cookieParser());

  // Configure body parser to preserve raw body for webhook endpoints
  // This is required for Stripe webhook signature verification
  // Must be configured BEFORE setting global prefix
  expressApp.use('/api/webhook', express.raw({ type: 'application/json' }));
  expressApp.use('/webhook', express.raw({ type: 'application/json' }));

  // Set global API prefix
  app.setGlobalPrefix('api');




  // Global exception filter để format lỗi
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Keanu API')
    .setDescription('API documentation for Keanu backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('reservations', 'Reservation management')
    .addTag('projects', 'Project management')
    .addTag('units', 'Unit management')
    .addTag('users', 'User management')
    .addTag('shortlist', 'Shortlist management')
    .addTag('payments', 'Payment processing')
    .addTag('admin', 'Admin operations')
    .addTag('ghl', 'GoHighLevel integration')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Add webhook route handler that bypasses global prefix
  // This allows Stripe to POST to /webhook (without /api prefix)
  const paymentsService = app.get(PaymentsService);
  expressApp.post('/webhook', async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[WEBHOOK-ROUTE] ${requestId} - Incoming webhook request`);
    console.log(`[WEBHOOK-ROUTE] ${requestId} - Headers:`, {
      'content-type': req.headers['content-type'],
      'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'missing',
      'user-agent': req.headers['user-agent'],
    });
    console.log(`[WEBHOOK-ROUTE] ${requestId} - Body size: ${req.body?.length || 0} bytes`);

    try {
      const signature = req.headers['stripe-signature'] as string;
      const rawBody = req.body as Buffer;

      if (!rawBody || rawBody.length === 0) {
        console.error(`[WEBHOOK-ROUTE] ${requestId} - ERROR: Empty request body`);
        return res.status(400).json({ error: 'Empty request body' });
      }

      if (!signature) {
        console.warn(`[WEBHOOK-ROUTE] ${requestId} - WARNING: No stripe-signature header`);
      }

      console.log(`[WEBHOOK-ROUTE] ${requestId} - Processing webhook...`);
      const result = await paymentsService.handleWebhook(rawBody, signature);
      const duration = Date.now() - startTime;
      console.log(`[WEBHOOK-ROUTE] ${requestId} - ✅ Successfully processed in ${duration}ms`);
      res.status(200).json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[WEBHOOK-ROUTE] ${requestId} - ❌ ERROR after ${duration}ms:`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
      });
      res.status(400).json({ error: error.message });
    }
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server is running on 0.0.0.0:${port}`);
  console.log(`Swagger documentation available at http://0.0.0.0:${port}/api`);
  console.log(`Stripe webhook endpoint available at http://0.0.0.0:${port}/webhook`);
}
bootstrap();
