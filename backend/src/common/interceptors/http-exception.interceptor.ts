import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Intercepteur pour normaliser le format des erreurs HTTP
 * Transforme tous les types d'erreurs en un format standardisé pour l'API
 */
@Injectable()
export class HttpExceptionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpExceptionInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        let statusCode: number;
        let message: string;
        let errorCode: string;
        let details: any = null;

        // Erreurs HTTP NestJS préformatées
        if (error instanceof HttpException) {
          statusCode = error.getStatus();
          const response = error.getResponse();

          // Si la réponse est un objet avec une structure 'message'
          if (typeof response === 'object' && response) {
            message = response['message'] || 'Une erreur est survenue';
            errorCode = response['errorCode'] || this.getErrorCodeFromStatus(statusCode);
            details = response['details'] || null;
          } else {
            message = response as string || 'Une erreur est survenue';
            errorCode = this.getErrorCodeFromStatus(statusCode);
          }
        } 
        // Erreurs Supabase (PostgreSQL)
        else if (error.code && error.message && error?.details) {
          this.logger.error(`Erreur Supabase: ${error.code} - ${error.message}`);
          
          // Violations de contraintes d'unicité
          if (error.code === '23505') {
            statusCode = HttpStatus.CONFLICT;
            message = 'Une ressource avec ces données existe déjà';
            errorCode = 'RESOURCE_CONFLICT';
            details = { constraint: error.details };
          }
          // Violations de clés étrangères
          else if (error.code === '23503') {
            statusCode = HttpStatus.BAD_REQUEST;
            message = 'Référence à une ressource inexistante';
            errorCode = 'FOREIGN_KEY_VIOLATION';
            details = { constraint: error.details };
          }
          // Autres erreurs de base de données
          else {
            statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Erreur de base de données';
            errorCode = 'DATABASE_ERROR';
            details = { dbCode: error.code };
          }
        }
        // Erreurs d'authentification Supabase
        else if (error.error && error.status) {
          this.logger.error(`Erreur Auth Supabase: ${error.status} - ${error.error}`);
          
          if (error.status === 400) {
            statusCode = HttpStatus.BAD_REQUEST;
            message = error.error?.message || 'Données d\'authentification invalides';
            errorCode = 'AUTH_ERROR';
            
            // Email déjà utilisé
            if (error.error?.message?.includes('email already')) {
              errorCode = 'EMAIL_ALREADY_USED';
              message = 'Cette adresse email est déjà utilisée';
            }
            // Mot de passe invalide
            else if (error.error?.message?.includes('password')) {
              errorCode = 'INVALID_PASSWORD';
              message = 'Le mot de passe est invalide ou ne respecte pas les critères de sécurité';
            }
          } else if (error.status === 401 || error.status === 403) {
            statusCode = error.status;
            message = 'Accès non autorisé';
            errorCode = 'UNAUTHORIZED';
          } else {
            statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
            message = error.error || 'Erreur d\'authentification';
            errorCode = 'AUTH_ERROR';
          }
        }
        // Erreurs génériques pour tout autre cas
        else {
          statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Une erreur inattendue est survenue';
          errorCode = 'INTERNAL_SERVER_ERROR';
          
          this.logger.error(
            `Erreur non gérée: ${error.message || JSON.stringify(error)}`,
            error.stack
          );
        }

        // Format de réponse standardisé
        const formattedError = {
          statusCode,
          message,
          errorCode,
          ...(details ? { details } : {}),
          timestamp: new Date().toISOString(),
        };

        // Log de l'erreur avec tous les détails pertinents
        this.logger.error(
          `HTTP Exception: [${statusCode}] ${errorCode} - ${message}`,
          details ? JSON.stringify(details) : ''
        );

        return throwError(() => new HttpException(formattedError, statusCode));
      }),
    );
  }

  /**
   * Génère un code d'erreur basé sur le code HTTP
   */
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return 'METHOD_NOT_ALLOWED';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INTERNAL_SERVER_ERROR';
      case HttpStatus.BAD_GATEWAY:
        return 'BAD_GATEWAY';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'UNKNOWN_ERROR';
    }
  }
}
