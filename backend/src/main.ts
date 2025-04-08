import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, RequestMethod, Logger, BadRequestException } from '@nestjs/common';
import { HttpExceptionInterceptor } from './common/interceptors/http-exception.interceptor';
import { CorsExceptionFilter } from './common/filters/cors-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  // Get ConfigService instance
  const configService = app.get(ConfigService);
  
  // ========== CONFIGURATION CORS =========
  // Configuration CORS simplifiée avec support explicite pour localhost:3000 et Ngrok
  const env = configService.get<string>('NODE_ENV') || 'development';
  
  // Récupérer le frontend et backend URL depuis les variables d'environnement ou utiliser les valeurs par défaut
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  const backendUrl = configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
  
  // Initialiser un tableau strict d'origines autorisées
  const allowedOrigins = ['http://localhost:3000'];
  
  // Ajouter le frontendUrl s'il n'est pas déjà inclus
  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
  
  // Ajouter des origines supplémentaires depuis ALLOWED_ORIGINS
  const originsFromEnv = configService.get<string>('ALLOWED_ORIGINS');
  if (originsFromEnv) {
    const additionalOrigins = originsFromEnv
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0 && !allowedOrigins.includes(origin));
    
    allowedOrigins.push(...additionalOrigins);
  }
  
  // Ajouter explicitement les origines ConvertKit (kit.com et convertkit.com)
  if (!allowedOrigins.includes('https://functions-js.kit.com')) {
    allowedOrigins.push('https://functions-js.kit.com');
  }
  
  // Log pour débugger
  console.log(`[CORS] Origines autorisées: ${JSON.stringify(allowedOrigins)}`);
  
  // Configurer CORS avec une liste explicite d'origines et des options plus permissives pour le développement
  const corsOptions = {
    origin: env === 'development' 
      ? (origin, callback) => {
          // En développement, autoriser toutes les origines mais les logger pour diagnostic
          console.log(`[CORS] Requête reçue de l'origine: ${origin || 'Aucune origine (requête locale)'}`);
          callback(null, true);
        }
      : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'User-Agent',
      'X-Requested-With',
      'DNT',
      'Referer',
      'X-Correlation-Id',
      'x-request-debug',
      'Sec-Fetch-Mode',
      'Access-Control-Request-Headers',
      'Access-Control-Request-Method',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'Access-Control-Allow-Headers'
    ],
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 heures en secondes - conserver le cache des résultats preflight plus longtemps
  };
  
  // Log détaillé des options CORS pour déboguer
  console.log(`[CORS] Configuration:
- Environment: ${env}
- Credentials autorisés: ${corsOptions.credentials}
- Options preflight status: ${corsOptions.optionsSuccessStatus}
- Mode Preflight: ${corsOptions.preflightContinue ? 'Continue' : 'Termine'}`);
  
  // ======== DEBUT CONFIGURATION CORS STANDARD - SOLUTION DEFINITIVE ========
  // Configuration CORS standard complète - Approche native NestJS
  // Cette configuration a été validée pour résoudre les problèmes de requêtes OPTIONS
  // et permettre l'authentification avec JWT
  
  // Détails supplémentaires pour le debugging
  console.log(`[CORS] Configuration STANDARD:`)
  console.log(`- Frontend URL: ${process.env.FRONTEND_URL || 'non défini'}`);
  console.log(`- Origines autorisées: ${JSON.stringify(allowedOrigins)}`);
  
  // Configuration CORS STANDARD complète
  app.enableCors({
    origin: (origin, callback) => {
      // Pas d'origine (requête locale ou même origine) - toujours autoriser
      if (!origin) {
        console.log(`[CORS main.ts] Allowed local origin`);
        callback(null, true);
        return;
      }
      
      // Vérification exacte des origines autorisées
      if (allowedOrigins.indexOf(origin) !== -1) {
        console.log(`[CORS main.ts] Allowed origin (exact match): ${origin}`);
        callback(null, true);
        return;
      }
      
      // Vérification spéciale pour les domaines ConvertKit (kit.com / convertkit.com)
      if (origin.includes('functions-js') && 
          (origin.includes('kit.com') || origin.includes('convertkit.com'))) {
        console.log(`[CORS main.ts] Allowed ConvertKit origin: ${origin}`);
        callback(null, true);
        return;
      }
      
      // Origine non autorisée
      console.error(`[CORS main.ts] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, Origin, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers, x-request-debug',
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 heures - cache des résultats preflight
  });
  
  // Log détaillé de la configuration CORS
  const corsLogger = new Logger('CORS');
  corsLogger.log(`CORS configuré en PRIORITÉ:`);
  corsLogger.log(`- Mode: ${env}`);
  corsLogger.log(`- Credentials: true`);
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
  
  // Filtres d'exception globaux dans un ordre spécifique:
  // 1. D'abord CorsExceptionFilter pour garantir les headers CORS sur TOUTES les réponses d'erreur
  // 2. Ensuite AllExceptionsFilter pour le formatage standard des erreurs
  app.useGlobalFilters(
    new CorsExceptionFilter(),  // Crucial: doit être premier pour gérer les 401/403 du JwtAuthGuard
    new AllExceptionsFilter()   // Formatage général des erreurs
  );
  
  // Log d'information sur l'activation du filtre CORS pour les erreurs
  const corsExceptionLogger = new Logger('CorsException');
  corsExceptionLogger.log('Filtre CORS activé pour toutes les réponses d\'erreur - spécialement les 401/403 du JwtAuthGuard');
  
  // Logging des intercepteurs configurés
  const interceptorLogger = new Logger('Interceptors');
  interceptorLogger.log('HttpExceptionInterceptor et ApiResponseInterceptor configurés avec succès');
  
  // URLs déjà définies plus haut, réutilisation des variables
  
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
