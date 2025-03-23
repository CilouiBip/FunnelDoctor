import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, RequestMethod, Logger, BadRequestException } from '@nestjs/common';
import { HttpExceptionInterceptor } from './common/interceptors/http-exception.interceptor';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get ConfigService instance
  const configService = app.get(ConfigService);
  
  // ========== CONFIGURATION CORS =========
  // Configuration CORS au début pour intercepter les préflights
  const env = configService.get<string>('NODE_ENV') || 'development';
  const allowCredentials = true;
  
  // Initialiser le tableau des origines autorisées
  let allowedOrigins: string[] = [];
  
  // Étape 1: Charger les origines depuis la variable ALLOWED_ORIGINS
  const originsFromEnv = configService.get<string>('ALLOWED_ORIGINS');
  if (originsFromEnv) {
    allowedOrigins = originsFromEnv
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
  }
  
  // Étape 2: Ajouter des origines spécifiques selon l'environnement
  if (env === 'development') {
    // En développement, autoriser localhost sur n'importe quel port
    // La validation se fait avec une fonction pour gérer les wildcards
    allowedOrigins.push('localhost');
    allowedOrigins.push('127.0.0.1');

  } else {
    // En production, s'assurer que FRONTEND_URL est inclus
    const frontendUrl = configService.get<string>('FRONTEND_URL');
    if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
      allowedOrigins.push(frontendUrl);
    }
  }
  
  // Si aucune origine n'est définie, utiliser un fallback
  if (allowedOrigins.length === 0) {
    if (env === 'development') {
      // Fallback pour le développement
      allowedOrigins = ['http://localhost:3000'];
    } else {
      // En production, si aucune origine n'est spécifiée, bloquer toutes les origines
      // ou utiliser un fallback selon votre politique de sécurité
      allowedOrigins = ['*']; // Utilisez avec précaution en production
    }
  }
  
  // Configurer CORS avec validation dynamique des origines
  app.enableCors({
    origin: (origin, callback) => {
      // En mode développement ou si pas d'origine (même origine), autoriser
      if (!origin || env === 'development' && (
        origin.includes('localhost') || 
        origin.includes('127.0.0.1')
      )) {
        callback(null, true);
        return;
      }

      // Pour les autres cas, vérifier la liste des origines autorisées
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        // Si l'origine autorisée est exactement *, tout autoriser
        if (allowedOrigin === '*') return true;
        // Sinon vérifier correspondance exacte
        return origin === allowedOrigin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed`), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: allowCredentials,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'User-Agent',
      'X-Requested-With',
      'X-Correlation-Id'
    ],
    exposedHeaders: ['Content-Disposition']
  });
  
  // Log détaillé de la configuration CORS
  const corsLogger = new Logger('CORS');
  corsLogger.log(`CORS configuré en PRIORITÉ:`);
  corsLogger.log(`- Mode: ${env}`);
  corsLogger.log(`- Credentials: ${allowCredentials}`);
  corsLogger.log(`- Origines autorisées: ${JSON.stringify(allowedOrigins)}`);
  // ======== FIN CONFIGURATION CORS ========
  
  // Enable validation pipe for DTO validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    // Amélioration des messages d'erreur de validation
    exceptionFactory: (errors) => {
      const formattedErrors = errors.map(error => {
        const constraints = error.constraints ? Object.values(error.constraints) : ['Validation error'];
        return {
          field: error.property,
          message: constraints[0],
          constraints: error.constraints
        };
      });
      
      // Utiliser directement BadRequestException qui est déjà importée
      return new BadRequestException({
        message: 'Validation des données échouée',
        errorCode: 'VALIDATION_ERROR',
        details: { errors: formattedErrors }
      });
    }
  }));
  
  // Intercepteur HTTP pour normaliser les réponses d'erreur
  app.useGlobalInterceptors(new HttpExceptionInterceptor());
  
  // Intercepteur pour standardiser les réponses API
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  
  // Filtre d'exception global pour capturer toutes les erreurs non gérées
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Logging des intercepteurs configurés
  const interceptorLogger = new Logger('Interceptors');
  interceptorLogger.log('HttpExceptionInterceptor et ApiResponseInterceptor configurés avec succès');
  
  // Récupérer les URLs pour le logging
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  const backendUrl = configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
  
  // Log de base URL pour vérification
  const urlLogger = new Logger('URLs');
  urlLogger.log(`Base frontend URL: ${frontendUrl}`);
  urlLogger.log(`Base backend URL: ${backendUrl}`);
  
  // Vérification des configurations d'URL requises
  if (!configService.get<string>('FRONTEND_URL')) {
    urlLogger.warn('FRONTEND_URL non définie dans .env, utilisation de la valeur par défaut http://localhost:3000');
  }
  if (!configService.get<string>('BACKEND_URL')) {
    urlLogger.warn('BACKEND_URL non définie dans .env, utilisation de la valeur par défaut http://localhost:3001');
  }


  
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
