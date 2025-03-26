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
      this.logger.log(`[AUTH SERVICE] Tentative de connexion pour: ${loginDto.email}`);

      // Find user by email
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        this.logger.warn(`[AUTH SERVICE] Connexion échouée: Utilisateur avec email ${loginDto.email} non trouvé`);
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      this.logger.log(`[AUTH SERVICE] Utilisateur trouvé avec ID: ${user.id}`);
      
      // Validate password
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);
      if (!isPasswordValid) {
        this.logger.warn(`[AUTH SERVICE] Connexion échouée: Mot de passe invalide pour ${loginDto.email}`);
        throw new UnauthorizedException('Email ou mot de passe incorrect');
      }

      this.logger.log(`[AUTH SERVICE] Mot de passe valide pour ${loginDto.email}, génération du token JWT...`);
      
      // Generate JWT token
      const token = this.generateToken(user.id, user.email);
      
      if (!token) {
        this.logger.error(`[AUTH SERVICE] ERREUR: Token généré est null ou undefined pour ${user.id}`);
        throw new InternalServerErrorException('Erreur lors de la génération du token');
      }
      
      this.logger.log(`[AUTH SERVICE] Token JWT généré avec succès pour ${user.id}, début: ${token.substring(0, 15)}...`);

      // Return user data and token
      const { password_hash, ...userWithoutPassword } = user;
      
      // Construction explicite de la réponse
      const response: AuthResponseDto = {
        user: userWithoutPassword,
        access_token: token
      };
      
      // Log de la réponse complète pour déboguer
      this.logger.log(`[AUTH SERVICE] Structure de réponse: ${JSON.stringify({
        contient_token: !!response.access_token,
        type_token: typeof response.access_token,
        longueur_token: response.access_token ? response.access_token.length : 0,
        clés_réponse: Object.keys(response),
        propriétés_utilisateur: Object.keys(response.user)
      })}`);
      
      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`[AUTH SERVICE] Erreur login: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Erreur lors de la connexion. Veuillez réessayer plus tard.');
    }
  }

  /**
   * Génère un token JWT pour un utilisateur
   * @param userId - ID de l'utilisateur 
   * @param email - Email de l'utilisateur
   * @returns Token JWT signé
   */
  private generateToken(userId: string, email: string): string {
    try {
      // Log des paramètres d'entrée
      this.logger.log(`[AUTH SERVICE][generateToken] Génération de token pour - userId: ${userId}, email: ${email}`);
      
      // SOLUTION: Créer une clé secrète par défaut pour le développement au cas où la variable d'environnement n'est pas définie
      // ATTENTION: Ceci est une solution temporaire pour débloquer le développement
      const DEFAULT_JWT_SECRET = 'funnel-doctor-dev-secret-key-temporary-DO-NOT-USE-IN-PRODUCTION';
      const DEFAULT_JWT_EXPIRES = '30d';
      
      // Récupération sécurisée des variables d'environnement avec valeurs par défaut
      let jwtSecret = this.configService.get<string>('JWT_SECRET');
      const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || DEFAULT_JWT_EXPIRES;
      
      // Log complet de l'environnement pour diagnostiquer le problème
      this.logger.log('[AUTH SERVICE][generateToken] Détails de l\'environnement:');
      this.logger.log(`- JWT_SECRET défini: ${!!jwtSecret}`);
      this.logger.log(`- JWT_EXPIRES_IN: ${jwtExpiresIn}`);
      this.logger.log(`- NODE_ENV: ${this.configService.get<string>('NODE_ENV') || 'non défini'}`);
      
      // Vérification du secret et utilisation d'un fallback si nécessaire
      if (!jwtSecret) {
        this.logger.warn('[AUTH SERVICE][generateToken] ATTENTION: JWT_SECRET non défini, utilisation de la clé par défaut pour le développement');
        jwtSecret = DEFAULT_JWT_SECRET;
      }
      
      // Construction du payload
      const payload = {
        sub: userId,
        email,
        // Ajout d'informations supplémentaires pour le débogage
        iat: Math.floor(Date.now() / 1000),
        aud: 'funnel-doctor-app',
        iss: 'funnel-doctor-api'
      };
      
      // Génération du token avec log détaillé
      this.logger.log('[AUTH SERVICE][generateToken] Tentative de signature du token...');
      this.logger.log(`- Option 'secret' définie: ${!!jwtSecret}`);
      this.logger.log(`- Option 'expiresIn' définie: ${!!jwtExpiresIn}`);
      
      // Génération du token
      let token;
      try {
        token = this.jwtService.sign(payload, {
          secret: jwtSecret,
          expiresIn: jwtExpiresIn
        });
      } catch (signError) {
        this.logger.error(`[AUTH SERVICE][generateToken] Erreur lors de la signature JWT: ${signError.message}`, signError.stack);
        throw new InternalServerErrorException(`Erreur de signature JWT: ${signError.message}`);
      }
      
      // Vérifier que le token est généré correctement
      if (!token) {
        this.logger.error('[AUTH SERVICE][generateToken] ERREUR: Token généré null ou undefined');
        throw new InternalServerErrorException('Echec de génération du token');
      }
      
      // Log de succès avec aperçu du token
      this.logger.log(`[AUTH SERVICE][generateToken] Token JWT généré avec succès!`);
      this.logger.log(`- Début: ${token.substring(0, 15)}...`);
      this.logger.log(`- Longueur: ${token.length} caractères`);
      this.logger.log(`- Format: ${token.split('.').length} segments JWT`);
      
      return token;
    } catch (error) {
      // Log d'erreur détaillé
      this.logger.error(`[AUTH SERVICE][generateToken] ERREUR de génération: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Erreur lors de la génération du token: ${error.message}`);
    }
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
  private  async saveToken(
    userId: string, 
    token: string, 
    tokenType: 'password_reset' | 'email_verification',
    expiresInHours: number = 1
  ): Promise<void> {
    try {
      // Log initial pour tracer l'appel de fonction
      this.logger.log(`Début de saveToken - userId: ${userId}, tokenType: ${tokenType}, expiresInHours: ${expiresInHours}`);
      
      // Vérifier que supabaseService est bien initialisé
      if (!this.supabaseService) {
        this.logger.error('SupabaseService n\'est pas injecté correctement');
        throw new InternalServerErrorException('Service de base de données non disponible');
      }
      
      // Log pour vérifier si getAdminClient fonctionne
      this.logger.log('Tentative d\'obtention du client Supabase admin...');
      const adminClient = this.supabaseService.getAdminClient();
      this.logger.log(`Client Supabase obtenu: ${!!adminClient}`);
      
      // Calculer la date d'expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      
      // Log des données avant insertion
      const tokenData = {
        user_id: userId,
        token,
        token_type: tokenType,
        expires_at: expiresAt.toISOString(),
      };
      this.logger.log(`Données du token à insérer: ${JSON.stringify(tokenData)}`);
      
      // Sauvegarder le token dans la base de données
      this.logger.log('Tentative d\'insertion dans la table reset_tokens...');
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('reset_tokens')
        .insert([tokenData])
        .select();
      
      // Log du résultat de l'opération
      if (data) {
        this.logger.log(`Token sauvegardé avec succès: ${JSON.stringify(data)}`);
      }
      
      if (error) {
        this.logger.error(`Erreur lors de la sauvegarde du token: ${error.message}`, error);
        this.logger.error(`Code d'erreur Supabase: ${error.code}, détails: ${JSON.stringify(error.details)}`);
        throw new InternalServerErrorException('Erreur lors de la sauvegarde du token');
      }
    } catch (error) {
      this.logger.error(`Exception lors de la sauvegarde du token: ${error.message}`);
      if (error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
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
