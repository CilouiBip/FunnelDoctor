import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware pour standardiser l'extraction du token JWT des requêtes
 * Cherche le token dans les différents emplacements possibles
 * (header Authorization, query string, cookies) et le normalise
 */
@Injectable()
export class JwtExtractionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtExtractionMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Chercher dans le header Authorization (prioritaire)
      let token = this.extractTokenFromHeader(req);

      // 2. Chercher dans les query params si absent du header
      if (!token) {
        token = this.extractTokenFromQuery(req);
      }

      // 3. Chercher dans les cookies si toujours absent
      if (!token) {
        token = this.extractTokenFromCookies(req);
      }

      // Si un token a été trouvé, l'assigner au header Authorization au format standard
      if (token) {
        req.headers.authorization = `Bearer ${token}`;
        
        // Log pour le débogage, niveau verbose (ne pas exposer le token complet en prod)
        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(`Token JWT extrait et normalisé: ${token.substring(0, 15)}...`);
        }
      }

      next();
    } catch (error) {
      this.logger.error(`Erreur lors de l'extraction du token JWT: ${error.message}`);
      // On ne bloque pas la requête en cas d'erreur, on laisse les guards gérer cela
      next();
    }
  }

  private extractTokenFromHeader(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ');
      
      // Accepter uniquement les tokens de type Bearer
      if (type === 'Bearer' && token) {
        return token;
      }
    }
    return undefined;
  }

  private extractTokenFromQuery(req: Request): string | undefined {
    // Chercher le token dans les paramètres d'URL: ?token=xxx ou ?access_token=xxx
    const tokenFromQuery = req.query.token || req.query.access_token;
    if (tokenFromQuery && typeof tokenFromQuery === 'string') {
      return tokenFromQuery;
    }
    return undefined;
  }

  private extractTokenFromCookies(req: Request): string | undefined {
    // Chercher le token dans les cookies: accessToken ou token
    if (req.cookies) {
      const tokenFromCookies = req.cookies.accessToken || req.cookies.token;
      if (tokenFromCookies && typeof tokenFromCookies === 'string') {
        return tokenFromCookies;
      }
    }
    return undefined;
  }
}
