import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    this.logger.debug(`JWT Auth Guard: Attempting to activate with context type: ${context.getType()}`);
    
    // Log request headers to see if Authorization is present
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      this.logger.debug(`Request headers: ${JSON.stringify(request.headers)}`);
      
      if (!request.headers.authorization) {
        this.logger.warn('No Authorization header found in request');
      }
    }
    
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err) {
      this.logger.error(`JWT Auth Error: ${err.message}`, err.stack);
      throw err;
    }
    
    if (!user) {
      this.logger.warn(`JWT Auth Failed: ${info?.message || 'No user found'}`);
      throw new UnauthorizedException('User not authenticated');
    }
    
    this.logger.debug(`JWT Auth Success: User ${user.id} authenticated`);
    return user;
  }
}
