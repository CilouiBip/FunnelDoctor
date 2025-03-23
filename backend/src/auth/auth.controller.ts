import { Body, Controller, Post, Get, Query, Param } from '@nestjs/common';
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
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
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
}
