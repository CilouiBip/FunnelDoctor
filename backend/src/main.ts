import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, RequestMethod } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get ConfigService instance
  const configService = app.get(ConfigService);
  
  // Enable validation pipe for DTO validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Configure CORS to allow requests from any origin for better SaaS flexibility
  const env = configService.get<string>('NODE_ENV') || 'development';
  const allowCredentials = configService.get<string>('CORS_ALLOW_CREDENTIALS') === 'true';
  
  // Get allowed origins from env var or use defaults
  let allowedOrigins: string | string[] | RegExp | RegExp[] = '*';
  
  // If credentials are required, we can't use '*' and must specify origins
  if (allowCredentials) {
    // Get allowed origins from .env or use defaults
    const originsFromEnv = configService.get<string>('ALLOWED_ORIGINS');
    
    if (originsFromEnv) {
      // Split by comma and trim whitespace
      allowedOrigins = originsFromEnv.split(',').map(origin => origin.trim());
    } else {
      // Fallback to defaults list
      allowedOrigins = [
        configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
        'https://zenalacarte.kit.com',
        'https://funnel.doctor.ngrok.app',
        'https://functions-js.convertkit.com',
        // More domains can be added to .env instead of here
      ];
    }
  }
  
  // Apply CORS configuration
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: allowCredentials,
  });
  
  // Log CORS configuration
  const corsLogger = new (await import('@nestjs/common')).Logger('CORS');
  corsLogger.log(`CORS configured: credentials=${allowCredentials}, origins=${typeof allowedOrigins === 'string' ? allowedOrigins : JSON.stringify(allowedOrigins)}`);


  
  // Set global prefix for API endpoints but exclude Calendly webhook path
  // This allows the URL /api/rdv/webhook to work without double /api/api/
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'api/rdv/webhook', method: RequestMethod.POST }
    ],
  });
  
  // Get port from environment variables or use 3001 as default
  const port = configService.get<number>('PORT') || 3001;
  
  await app.listen(port);
  const logger = new (await import('@nestjs/common')).Logger('Bootstrap');
  logger.log(`

=== APPLICATION STARTED SUCCESSFULLY ===
* NestJS server listening on port ${port}
* Date: ${new Date().toISOString()}
* Environment: ${process.env.NODE_ENV || 'development'}
* CORS allowed origin: ${configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}
=======================================

`);
}

bootstrap();
