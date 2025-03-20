import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
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
}
