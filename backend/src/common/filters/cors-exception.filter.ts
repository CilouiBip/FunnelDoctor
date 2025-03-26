import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtre d'exception global qui assure que toutes les réponses d'erreur
 * contiennent les headers CORS appropriés, même celles générées par les guards
 * comme JwtAuthGuard (401 Unauthorized, 403 Forbidden).
 *
 * Cela garantit que le navigateur peut recevoir et traiter correctement
 * les réponses d'erreur sans les bloquer à cause d'une violation CORS.
 */
@Catch(HttpException)
export class CorsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CorsExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const origin = request.headers.origin;

    // Si la requête a une origine (envoyée depuis un navigateur)
    if (origin) {
      // Déterminer si l'origine est autorisée (même logique que dans main.ts)
      const allowedOrigins = [
        process.env.FRONTEND_URL, 
        'http://localhost:3000'
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        this.logger.debug(
          `[CORS Exception] Adding CORS headers for origin ${origin} to error response ${status}`
        );

        // Ajouter les headers CORS nécessaires à la réponse d'erreur
        response.header('Access-Control-Allow-Origin', origin);
        response.header('Access-Control-Allow-Credentials', 'true');
        response.vary('Origin'); // Bonne pratique pour les réponses variables selon l'origine
      }
    }

    // Loguer l'erreur pour débogage
    if (status === 401 || status === 403) {
      this.logger.warn(
        `[Auth Error] ${status} ${request.method} ${request.url} - Origin: ${origin || 'None'}`
      );
    }

    // Passer l'exception à NestJS pour qu'il puisse générer la réponse d'erreur
    // avec tous les headers que nous venons d'ajouter
    response.status(status).json(exception.getResponse());
  }
}
