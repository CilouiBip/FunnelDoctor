import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

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
  
  // Configure CORS to allow requests from the frontend
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });
  
  // Set global prefix for API endpoints
  app.setGlobalPrefix('api');
  
  // Get port from environment variables or use 3001 as default
  const port = configService.get<number>('PORT') || 3001;
  
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}

bootstrap();
