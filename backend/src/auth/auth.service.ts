import { Injectable, UnauthorizedException, Logger, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../common/services/email.service';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private supabaseService: SupabaseService,
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

      // Envoyer un email de vérification
      this.sendVerificationEmail(user.email, user.id)
        .then(() => this.logger.log(`Email de vérification envoyé pour l'utilisateur: ${user.id}`))
        .catch(err => this.logger.error(`Erreur lors de l'envoi de l'email de vérification: ${err.message}`, err.stack));

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

  /**
   * Génère un token aléatoire pour la réinitialisation de mot de passe ou la vérification d'email
   * @param tokenType - Type de token ('password_reset' ou 'email_verification')
   */
  private generateRandomToken(tokenType: 'password_reset' | 'email_verification'): string {
    // Générer un token aléatoire de 32 caractères hexadécimaux
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Enregistre un token dans la base de données
   * @param userId - ID de l'utilisateur
   * @param token - Token généré
   * @param tokenType - Type de token ('password_reset' ou 'email_verification')
   * @param expiresInHours - Durée de validité du token en heures
   */
  private async saveToken(
    userId: string, 
    token: string, 
    tokenType: 'password_reset' | 'email_verification',
    expiresInHours: number = 1
  ): Promise<void> {
    try {
      // Calculer la date d'expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      
      // Sauvegarder le token dans la base de données
      const { error } = await this.supabaseService
        .getAdminClient()
        .from('reset_tokens')
        .insert([{
          user_id: userId,
          token,
          token_type: tokenType,
          expires_at: expiresAt.toISOString(),
        }]);
      
      if (error) {
        this.logger.error(`Erreur lors de la sauvegarde du token: ${error.message}`, error);
        throw new InternalServerErrorException('Erreur lors de la sauvegarde du token');
      }
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde du token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la sauvegarde du token');
    }
  }

  /**
   * Vérifie la validité d'un token
   * @param token - Token à vérifier
   * @param tokenType - Type de token ('password_reset' ou 'email_verification')
   * @returns L'ID de l'utilisateur associé au token si valide
   */
  private async verifyToken(
    token: string, 
    tokenType: 'password_reset' | 'email_verification'
  ): Promise<string> {
    try {
      // Vérifier le token dans la base de données
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('token_type', tokenType)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) {
        this.logger.warn(`Token invalide ou expiré: ${token}`);
        throw new UnauthorizedException('Token invalide ou expiré');
      }
      
      return data.user_id;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la vérification du token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la vérification du token');
    }
  }

  /**
   * Marque un token comme utilisé
   * @param token - Token à marquer comme utilisé
   */
  private async markTokenAsUsed(token: string): Promise<void> {
    try {
      const { error } = await this.supabaseService
        .getAdminClient()
        .from('reset_tokens')
        .update({ used: true })
        .eq('token', token);
      
      if (error) {
        this.logger.error(`Erreur lors du marquage du token comme utilisé: ${error.message}`, error);
        throw new InternalServerErrorException('Erreur lors du marquage du token comme utilisé');
      }
    } catch (error) {
      this.logger.error(`Erreur lors du marquage du token comme utilisé: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors du marquage du token comme utilisé');
    }
  }

  /**
   * Traitement de la demande de réinitialisation de mot de passe
   * @param forgotPasswordDto - DTO contenant l'email
   * @returns Message de confirmation
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    try {
      const { email } = forgotPasswordDto;
      this.logger.log(`Demande de réinitialisation de mot de passe pour l'email: ${email}`);
      
      // Vérifier si l'utilisateur existe
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        // Pour des raisons de sécurité, ne pas indiquer si l'email existe ou non
        this.logger.warn(`Tentative de réinitialisation pour un email inexistant: ${email}`);
        return { message: 'Si votre email est enregistré, vous recevrez un lien de réinitialisation.' };
      }
      
      // Générer un token aléatoire
      const resetToken = this.generateRandomToken('password_reset');
      
      // Sauvegarder le token dans la base de données
      await this.saveToken(user.id, resetToken, 'password_reset');
      
      // Envoyer l'email de réinitialisation
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      await this.emailService.sendPasswordResetEmail(email, resetToken, frontendUrl);
      
      this.logger.log(`Email de réinitialisation envoyé à: ${email}`);
      return { message: 'Si votre email est enregistré, vous recevrez un lien de réinitialisation.' };
    } catch (error) {
      this.logger.error(`Erreur lors de la demande de réinitialisation: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la demande de réinitialisation. Veuillez réessayer plus tard.');
    }
  }

  /**
   * Réinitialisation du mot de passe avec le token
   * @param resetPasswordDto - DTO contenant le token et le nouveau mot de passe
   * @returns Message de confirmation
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      const { token, password } = resetPasswordDto;
      this.logger.log(`Tentative de réinitialisation de mot de passe avec token`);
      
      // Vérifier la validité du token
      const userId = await this.verifyToken(token, 'password_reset');
      
      // Hasher le nouveau mot de passe
      const salt = await bcrypt.genSalt();
      const password_hash = await bcrypt.hash(password, salt);
      
      // Mettre à jour le mot de passe de l'utilisateur
      await this.usersService.updatePassword(userId, password_hash);
      
      // Marquer le token comme utilisé
      await this.markTokenAsUsed(token);
      
      this.logger.log(`Mot de passe réinitialisé avec succès pour l'utilisateur: ${userId}`);
      return { message: 'Votre mot de passe a été réinitialisé avec succès' };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la réinitialisation du mot de passe: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la réinitialisation du mot de passe. Veuillez réessayer plus tard.');
    }
  }

  /**
   * Envoi d'un email de vérification lors de l'inscription
   * @param email - Email de l'utilisateur
   * @param userId - ID de l'utilisateur
   */
  async sendVerificationEmail(email: string, userId: string): Promise<void> {
    try {
      // Générer un token de vérification
      const verificationToken = this.generateRandomToken('email_verification');
      
      // Sauvegarder le token dans la base de données (valide 24h)
      await this.saveToken(userId, verificationToken, 'email_verification', 24);
      
      // Envoyer l'email de vérification
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      await this.emailService.sendVerificationEmail(email, verificationToken, frontendUrl);
      
      this.logger.log(`Email de vérification envoyé à: ${email}`);
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi de l'email de vérification: ${error.message}`, error.stack);
      // Ne pas bloquer l'inscription si l'envoi de l'email échoue
    }
  }

  /**
   * Vérification de l'email d'un utilisateur
   * @param token - Token de vérification
   * @returns Message de confirmation
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Tentative de vérification d'email avec token`);
      
      // Vérifier la validité du token
      const userId = await this.verifyToken(token, 'email_verification');
      
      // Mettre à jour le statut de vérification de l'utilisateur
      await this.usersService.markEmailAsVerified(userId);
      
      // Marquer le token comme utilisé
      await this.markTokenAsUsed(token);
      
      this.logger.log(`Email vérifié avec succès pour l'utilisateur: ${userId}`);
      return { message: 'Votre adresse email a été vérifiée avec succès' };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Erreur lors de la vérification de l'email: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la vérification de l\'email. Veuillez réessayer plus tard.');
    }
  }
}
