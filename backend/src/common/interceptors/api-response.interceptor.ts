import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interface pour les réponses API standardisées
 * Toutes les réponses suivront ce format pour plus de cohérence
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  correlationId?: string;
}

/**
 * Intercepteur pour standardiser les réponses API
 * Encapsule toutes les réponses dans un format cohérent
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  private readonly logger = new Logger(ApiResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers['x-correlation-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Si l'en-tête n'existait pas, l'ajouter pour la traçabilité
    if (!request.headers['x-correlation-id']) {
      request.headers['x-correlation-id'] = correlationId;
    }

    return next.handle().pipe(
      map((data) => {
        // Si la réponse est déjà au format ApiResponse, ne pas la transformer à nouveau
        if (data && typeof data === 'object' && 'success' in data && 'data' in data && 'timestamp' in data) {
          return data as ApiResponse<T>;
        }

        // Consigner la réponse pour le débogage (en environnement de développement)
        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(
            `Réponse API formatée: ${correlationId}\n` +
            `Route: ${request.method} ${request.url}\n` +
            `Status: ${context.switchToHttp().getResponse().statusCode}`
          );
        }

        // Transformation en format de réponse standard
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          correlationId
        };
      }),
    );
  }
}
