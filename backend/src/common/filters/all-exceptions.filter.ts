import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Filtre global pour capturer toutes les exceptions non gu00e9ru00e9es
 * Complu00e8te l'intercepteur HTTP en capturant les erreurs qui pourraient survenir
 * avant que l'intercepteur ne puisse les traiter
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let statusCode: number;
    let message: string;
    let errorCode: string;
    let details: any = null;

    // Pour les exceptions HTTP NestJS
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Analyse du format de la ru00e9ponse d'erreur
      if (typeof exceptionResponse === 'object' && exceptionResponse) {
        // Si du00e9ju00e0 formatu00e9 par notre intercepteur, conserver le format
        if ('errorCode' in exceptionResponse) {
          return response.status(statusCode).json(exceptionResponse);
        }

        message = exceptionResponse['message'] || 'Une erreur est survenue';
        errorCode = exceptionResponse['errorCode'] || this.getErrorCodeFromStatus(statusCode);
        details = exceptionResponse['details'] || null;
      } else {
        message = exceptionResponse as string || 'Une erreur est survenue';
        errorCode = this.getErrorCodeFromStatus(statusCode);
      }
    } 
    // Pour toutes les autres erreurs non gu00e9ru00e9es
    else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception instanceof Error ? exception.message : 'Une erreur inattendue est survenue';
      errorCode = 'INTERNAL_SERVER_ERROR';

      // Loguer l'erreur non gu00e9ru00e9e avec la stack trace si disponible
      this.logger.error(
        `Exception non gu00e9ru00e9e: ${message}`,
        exception instanceof Error ? exception.stack : ''
      );
    }

    // Format standard de ru00e9ponse d'erreur
    const errorResponse = {
      statusCode,
      message,
      errorCode,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log de l'erreur avec du00e9tails supplu00e9mentaires pour le du00e9bogage
    this.logger.error(
      `Exception filtru00e9e: [${statusCode}] ${errorCode} - ${message} - URL: ${request.method} ${request.url}`,
      details ? JSON.stringify(details) : ''
    );

    response.status(statusCode).json(errorResponse);
  }

  /**
   * Gu00e9nu00e8re un code d'erreur basu00e9 sur le code HTTP
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
