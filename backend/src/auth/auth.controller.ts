import { Body, Controller, Post, Get, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponseDto> {
    console.log(`[AUTH CONTROLLER] Données reçues pour signup: ${JSON.stringify(signupDto, null, 2)}`);
    console.log('[AUTH CONTROLLER] Type de chaque champ:', {
      email: typeof signupDto.email,
      password: typeof signupDto.password,
      full_name: typeof signupDto.full_name,
      company_name: typeof signupDto.company_name,
      plan_id: typeof signupDto.plan_id
    });
    try {
      const result = await this.authService.signup(signupDto);
      console.log('[AUTH CONTROLLER] Signup réussi');
      return result;
    } catch (error) {
      console.error('[AUTH CONTROLLER] Erreur signup:', error.message, error.stack);
      throw error;
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    console.log('[AUTH CONTROLLER] Tentative de connexion avec:', loginDto.email);
    
    try {
      // Récupérer la réponse du service d'authentification
      const authResult = await this.authService.login(loginDto);
      
      // Log la réponse COMPLÈTE pour diagnostiquer
      console.log('[AUTH CONTROLLER] Réponse COMPLÈTE du service auth:', JSON.stringify(authResult));
      
      // Forcer explicitement le format de réponse avec accès direct au token
      const response = {
        access_token: authResult.access_token,
        user: authResult.user
      };
      
      // Log détaillé de la réponse finale formatée
      console.log('[AUTH CONTROLLER] Détails de la réponse finale:');
      console.log('- Propriétés:', Object.keys(response));
      console.log('- Type de access_token:', typeof response.access_token);
      console.log('- access_token présent:', response.access_token ? 'OUI' : 'NON');
      if (response.access_token) {
        console.log('- Longueur du token:', response.access_token.length);
        console.log('- Début du token:', response.access_token.substring(0, 20) + '...');
      } else {
        console.log('- ALERTE: access_token est absent, null ou undefined');
      }
      
      // Vérification finale pour alerter si le token est manquant
      if (!response.access_token) {
        console.error('[AUTH CONTROLLER] ERREUR CRITIQUE: Le token est absent dans la réponse finale!');
      } else {
        console.log('[AUTH CONTROLLER] Succès: Token présent dans la réponse finale');
      }
      
      return response;
    } catch (error) {
      console.error('[AUTH CONTROLLER] Erreur login:', error.message, error.stack);
      throw error;
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    console.log(`[AUTH CONTROLLER] Demande de réinitialisation de mot de passe pour: ${forgotPasswordDto.email}`);
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    console.log('[AUTH CONTROLLER] Tentative de réinitialisation de mot de passe avec token');
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string): Promise<{ message: string }> {
    console.log('[AUTH CONTROLLER] Tentative de vérification d\'email avec token');
    return this.authService.verifyEmail(token);
  }

  // Optionnel: endpoint pour renvoyer un email de vérification
  @Post('resend-verification')
  async resendVerification(@Body() { email }: { email: string }): Promise<{ message: string }> {
    console.log(`[AUTH CONTROLLER] Demande de renvoi d'email de vérification pour: ${email}`);
    
    const user = await this.authService['usersService'].findByEmail(email);
    if (user && !user.is_verified) {
      await this.authService.sendVerificationEmail(email, user.id);
      return { message: 'Si votre email est enregistré, vous recevrez un nouvel email de vérification.' };
    }
    
    // Pour des raisons de sécurité, ne pas indiquer si l'email existe ou est déjà vérifié
    return { message: 'Si votre email est enregistré, vous recevrez un nouvel email de vérification.' };
  }

  // ===== Endpoints de test pour diagnostiquer les problèmes d'authentification =====
  
  @Get('test-protected')
  @UseGuards(JwtAuthGuard)
  testProtectedRoute() {
    console.log('[AUTH CONTROLLER] Test d\'une route protégée par JWT');
    return {
      status: 'success',
      message: 'JWT OK - Cette route est protégée par JWT et vous y avez accès',
      timestamp: new Date().toISOString()
    };
  }
  
  @Get('test-cors')
  testCors() {
    console.log('[AUTH CONTROLLER] Test CORS sans authentification');
    return {
      status: 'success',
      message: 'CORS OK - Cette route est accessible sans authentification',
      timestamp: new Date().toISOString(),
      headers: 'Les headers CORS sont corrects'
    };
  }
}
