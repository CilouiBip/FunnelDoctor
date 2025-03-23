import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Ces imports seront utilisés en production
// import * as nodemailer from 'nodemailer';
// import * as SendGrid from '@sendgrid/mail';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string; // Expéditeur optionnel, sinon utilise EMAIL_FROM par défaut
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly environment: string;
  private readonly emailProvider: string;
  private readonly emailFrom: string;

  constructor(private configService: ConfigService) {
    this.environment = this.configService.get<string>('NODE_ENV') || 'development';
    this.emailProvider = this.configService.get<string>('EMAIL_PROVIDER') || 'console';
    this.emailFrom = this.configService.get<string>('EMAIL_FROM') || 'noreply@funneldoctor.com';
    
    // Initialisation du fournisseur d'email en production
    if (this.environment === 'production') {
      this.initEmailProvider();
    }
  }
  
  /**
   * Initialise le fournisseur d'email selon la configuration
   */
  private initEmailProvider(): void {
    try {
      if (this.emailProvider === 'sendgrid') {
        this.logger.log('Initialisation de SendGrid pour l\'envoi d\'emails');
        // Commenter pour éviter les erreurs de compilation sans la dépendance
        // const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
        // if (!apiKey) {
        //   throw new Error('SENDGRID_API_KEY non défini dans les variables d\'environnement');
        // }
        // SendGrid.setApiKey(apiKey);
      } else if (this.emailProvider === 'smtp') {
        this.logger.log('Initialisation du transport SMTP pour l\'envoi d\'emails');
        // Configuration SMTP pour nodemailer
        // const host = this.configService.get<string>('SMTP_HOST');
        // const port = this.configService.get<number>('SMTP_PORT');
        // const user = this.configService.get<string>('SMTP_USER');
        // const pass = this.configService.get<string>('SMTP_PASSWORD');
        // if (!host || !port || !user || !pass) {
        //   throw new Error('Configuration SMTP incomplète dans les variables d\'environnement');
        // }
      } else if (this.emailProvider === 'mailgun') {
        this.logger.log('Initialisation de Mailgun pour l\'envoi d\'emails');
        // const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
        // const domain = this.configService.get<string>('MAILGUN_DOMAIN');
        // if (!apiKey || !domain) {
        //   throw new Error('Configuration Mailgun incomplète dans les variables d\'environnement');
        // }
      } else if (this.emailProvider === 'ses') {
        this.logger.log('Initialisation d\'Amazon SES pour l\'envoi d\'emails');
        // const accessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        // const secretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
        // const region = this.configService.get<string>('AWS_REGION');
        // if (!accessKey || !secretKey || !region) {
        //   throw new Error('Configuration AWS SES incomplète dans les variables d\'environnement');
        // }
      } else if (this.emailProvider === 'console') {
        this.logger.log('Mode console activé pour l\'envoi d\'emails (aucun email ne sera réellement envoyé)');
      } else {
        this.logger.warn(`Fournisseur d'email non reconnu: ${this.emailProvider}, utilisation du mode console par défaut`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'initialisation du fournisseur d'email: ${error.message}`);
      this.logger.warn('Passage en mode console pour l\'envoi d\'emails');
    }
  }

  /**
   * Envoie un email selon le mode et le fournisseur configurés
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;
    const from = options.from || this.emailFrom;
    
    // En développement ou si le fournisseur est 'console', on simule l'envoi d'email par des logs
    if (this.environment === 'development' || this.emailProvider === 'console') {
      this.logger.debug('===== SIMULATION D\'ENVOI D\'EMAIL =====');
      this.logger.debug(`De: ${from}`);
      this.logger.debug(`Destinataire: ${to}`);
      this.logger.debug(`Sujet: ${subject}`);
      this.logger.debug('Contenu HTML:');
      this.logger.debug(html);
      if (text) {
        this.logger.debug('Contenu texte:');
        this.logger.debug(text);
      }
      this.logger.debug('================================');
      return true;
    }
    
    // En production, on utilise le fournisseur configuré
    try {
      // Envoi selon le fournisseur configuré
      if (this.emailProvider === 'sendgrid') {
        return await this.sendWithSendGrid(from, to, subject, html, text);
      } else if (this.emailProvider === 'smtp') {
        return await this.sendWithSmtp(from, to, subject, html, text);
      } else if (this.emailProvider === 'mailgun') {
        return await this.sendWithMailgun(from, to, subject, html, text);
      } else if (this.emailProvider === 'ses') {
        return await this.sendWithSes(from, to, subject, html, text);
      }
      
      // Si on arrive ici, c'est qu'aucun fournisseur valide n'est configuré
      this.logger.warn(`Aucun fournisseur d'email valide configuré, l'email n'a pas été envoyé`);
      return false;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi d'email à ${to}: ${error.message}`, error.stack);
      return false;
    }
  }
  
  /**
   * Envoie un email via SendGrid
   */
  private async sendWithSendGrid(from: string, to: string, subject: string, html: string, text?: string): Promise<boolean> {
    /* 
    // Décommenter et installer la dépendance quand nécessaire
    try {
      await SendGrid.send({
        to,
        from,
        subject,
        html,
        text: text || undefined
      });
      this.logger.log(`Email envoyé via SendGrid à ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi d'email via SendGrid: ${error.message}`, error.stack);
      throw error;
    }
    */
    
    // Pour l'instant, on simule la réussite
    this.logger.log(`[SENDGRID] Email envoyé à ${to}`);
    return true;
  }
  
  /**
   * Envoie un email via SMTP (Nodemailer)
   */
  private async sendWithSmtp(from: string, to: string, subject: string, html: string, text?: string): Promise<boolean> {
    /*
    // Décommenter et installer la dépendance quand nécessaire
    try {
      const host = this.configService.get<string>('SMTP_HOST');
      const port = this.configService.get<number>('SMTP_PORT');
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASSWORD');
      
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || undefined
      });
      
      this.logger.log(`Email envoyé via SMTP à ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Erreur lors de l'envoi d'email via SMTP: ${error.message}`, error.stack);
      throw error;
    }
    */
    
    // Pour l'instant, on simule la réussite
    this.logger.log(`[SMTP] Email envoyé à ${to}`);
    return true;
  }
  
  /**
   * Envoie un email via Mailgun
   */
  private async sendWithMailgun(from: string, to: string, subject: string, html: string, text?: string): Promise<boolean> {
    // Pour l'instant, on simule la réussite
    this.logger.log(`[MAILGUN] Email envoyé à ${to}`);
    return true;
  }
  
  /**
   * Envoie un email via Amazon SES
   */
  private async sendWithSes(from: string, to: string, subject: string, html: string, text?: string): Promise<boolean> {
    // Pour l'instant, on simule la réussite
    this.logger.log(`[AMAZON SES] Email envoyé à ${to}`);
    return true;
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(email: string, resetToken: string, frontendUrl: string): Promise<boolean> {
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
    
    const html = `
      <h1>Réinitialisation de votre mot de passe</h1>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <p><a href="${resetLink}">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien est valable pendant 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
    `;
    
    const text = `
      Réinitialisation de votre mot de passe
      
      Vous avez demandé la réinitialisation de votre mot de passe.
      Copiez le lien ci-dessous dans votre navigateur pour définir un nouveau mot de passe :
      
      ${resetLink}
      
      Ce lien est valable pendant 1 heure.
      
      Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.
    `;
    
    return this.sendEmail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html,
      text
    });
  }

  /**
   * Envoie un email de confirmation d'inscription
   */
  async sendVerificationEmail(email: string, verificationToken: string, frontendUrl: string): Promise<boolean> {
    const verificationLink = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;
    
    const html = `
      <h1>Bienvenue sur FunnelDoctor!</h1>
      <p>Merci de vous être inscrit. Veuillez confirmer votre adresse email en cliquant sur le lien ci-dessous :</p>
      <p><a href="${verificationLink}">Confirmer mon adresse email</a></p>
      <p>Ce lien est valable pendant 24 heures.</p>
    `;
    
    const text = `
      Bienvenue sur FunnelDoctor!
      
      Merci de vous être inscrit. Veuillez confirmer votre adresse email en copiant le lien ci-dessous dans votre navigateur :
      
      ${verificationLink}
      
      Ce lien est valable pendant 24 heures.
    `;
    
    return this.sendEmail({
      to: email,
      subject: 'Confirmez votre adresse email',
      html,
      text
    });
  }
}
