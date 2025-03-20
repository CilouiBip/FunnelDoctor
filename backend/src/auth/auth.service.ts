import { Injectable, UnauthorizedException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    try {
      const { email, password, full_name, company_name, plan_id } = signupDto;
      
      this.logger.log(`Attempt to signup user with email: ${email}, full_name: ${full_name}, company_name: ${company_name || 'not provided'}, plan_id: ${plan_id || 'using default'}`);
      
      // Check if user already exists
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        this.logger.warn(`Signup failed: Email ${email} already exists`);
        throw new UnauthorizedException('Cet email est déjà utilisé');
      }

      // Validate full_name is provided
      if (!full_name || full_name.trim() === '') {
        this.logger.warn(`Signup failed: Missing full_name for email ${email}`);
        throw new UnauthorizedException('Le nom complet est requis');
      }

      // Hash password once in AuthService and don't let UsersService hash it again
      const salt = await bcrypt.genSalt();
      const password_hash = await bcrypt.hash(password, salt);
      
      // Pass the password_hash directly to bypass double hashing in UsersService
      const userDataToCreate = {
        email,
        full_name,
        company_name,
        plan_id,
        password_hash,
        // Not passing the 'password' field to avoid double hashing
      };
      
      // Create user with prepared data
      this.logger.log(`Creating user with email: ${email}`);
      const user = await this.usersService.createWithHash(userDataToCreate);
      this.logger.log(`User created successfully with ID: ${user.id}`);

      // Generate JWT token
      const token = this.generateToken(user.id, user.email);
      this.logger.log(`JWT token generated for user: ${user.id}`);

      // Return user data and token
      const { password_hash: _, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        access_token: token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Signup error: ${error.message || 'Unknown error'}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la création du compte. Veuillez réessayer plus tard.');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      this.logger.log(`Attempt to login user with email: ${loginDto.email}`);

      // Find user by email
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        this.logger.warn(`Login failed: User with email ${loginDto.email} not found`);
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Validate password
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);
      if (!isPasswordValid) {
        this.logger.warn(`Login failed: Invalid password for user with email ${loginDto.email}`);
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      // Generate JWT token
      const token = this.generateToken(user.id, user.email);
      this.logger.log(`Login successful: JWT token generated for user ${user.id}`);

      // Return user data and token
      const { password_hash, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        access_token: token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la connexion. Veuillez réessayer plus tard.');
    }
  }

  private generateToken(userId: string, email: string): string {
    const payload = {
      sub: userId,
      email,
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });
  }
}
