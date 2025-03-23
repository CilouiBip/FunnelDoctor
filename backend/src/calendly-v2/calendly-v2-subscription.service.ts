import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { CreateWebhookSubscriptionDto, WebhookSubscriptionResponseDto } from './dto/subscription-response.dto';

@Injectable()
export class CalendlyV2SubscriptionService {
  private readonly logger = new Logger(CalendlyV2SubscriptionService.name);
  private readonly apiBaseUrl = 'https://api.calendly.com';
  private readonly headers: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const token = this.configService.get<string>('CALENDLY_PERSONAL_ACCESS_TOKEN');
    if (!token) {
      this.logger.error('CALENDLY_PERSONAL_ACCESS_TOKEN not found in environment variables');
    }
    
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Ru00e9cupu00e8re les souscriptions webhook existantes
   */
  async listWebhookSubscriptions() {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.apiBaseUrl}/webhook_subscriptions`,
          { headers: this.headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching webhook subscriptions: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to list webhook subscriptions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cru00e9e une nouvelle souscription webhook
   * @param dto Les paramu00e8tres de la souscription
   */
  async createWebhookSubscription(dto: CreateWebhookSubscriptionDto): Promise<WebhookSubscriptionResponseDto> {
    try {
      // Vu00e9rifier si la scope est 'user' ou 'organization'
      if (dto.scope !== 'user' && dto.scope !== 'organization') {
        throw new Error(`Invalid scope: ${dto.scope}. Must be 'user' or 'organization'`);
      }

      // Si c'est une scope utilisateur, ru00e9cupu00e9rer l'URI de l'utilisateur actuel
      if (dto.scope === 'user' && !dto.user_uri) {
        const currentUser = await this.getCurrentUser();
        dto.user_uri = currentUser.resource.uri;
      }

      // Cru00e9er le payload pour la requu00eate
      const payload = {
        url: dto.url,
        events: dto.events,
        scope: dto.scope,
        ...(dto.organization_uri && { organization: dto.organization_uri }),
        ...(dto.user_uri && { user: dto.user_uri }),
        ...(dto.signing_key && { signing_key: dto.signing_key }),
      };

      this.logger.debug(`Creating webhook subscription with payload: ${JSON.stringify(payload)}`);

      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.apiBaseUrl}/webhook_subscriptions`,
          payload,
          { headers: this.headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error creating webhook subscription: ${error.message}`, error.stack);
            if (error.response?.data) {
              this.logger.error(`API response: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
          }),
        ),
      );

      this.logger.log(`Webhook subscription created successfully: ${data.resource?.uri || 'unknown URI'}`);
      return data.resource;
    } catch (error) {
      this.logger.error(`Failed to create webhook subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Supprime une souscription webhook existante
   * @param subscriptionUri URI de la souscription u00e0 supprimer
   */
  async deleteWebhookSubscription(subscriptionUri: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.delete(
          subscriptionUri,
          { headers: this.headers }
        ).pipe(
          catchError((error) => {
            this.logger.error(`Error deleting webhook subscription: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      this.logger.log(`Webhook subscription deleted successfully: ${subscriptionUri}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete webhook subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ru00e9cupu00e8re les informations de l'utilisateur Calendly actuel
   */
  private async getCurrentUser() {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/users/me`, { headers: this.headers }).pipe(
          catchError((error) => {
            this.logger.error(`Error fetching current user: ${error.message}`, error.stack);
            throw error;
          }),
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to get current user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cru00e9e ou met u00e0 jour une souscription webhook pour les u00e9vu00e9nements spu00e9cifiu00e9s
   * Vu00e9rifie d'abord si une souscription correspondante existe du00e9ju00e0
   * @param callbackUrl URL de callback pour la souscription
   * @param events Liste des u00e9vu00e9nements u00e0 souscrire
   */
  async setupWebhookSubscription(callbackUrl: string, events: string[] = ['invitee.created', 'invitee.canceled']) {
    try {
      // Ru00e9cupu00e9rer les souscriptions existantes
      const existingSubscriptions = await this.listWebhookSubscriptions();
      const subscriptions = existingSubscriptions.collection || [];
      
      // Vu00e9rifier si une souscription avec cette URL existe du00e9ju00e0
      const existingSubscription = subscriptions.find(
        (sub: any) => sub.callback_url === callbackUrl
      );
      
      if (existingSubscription) {
        this.logger.log(`Webhook subscription already exists for ${callbackUrl}`);
        return existingSubscription;
      }
      
      // Cru00e9er une nouvelle souscription
      const signingKey = this.configService.get<string>('CALENDLY_WEBHOOK_SIGNING_KEY');
      
      const subscriptionData: CreateWebhookSubscriptionDto = {
        url: callbackUrl,
        scope: 'user', // On utilise l'utilisateur actuel par du00e9faut
        events,
        ...(signingKey && { signing_key: signingKey }),
      };
      
      const newSubscription = await this.createWebhookSubscription(subscriptionData);
      this.logger.log(`New webhook subscription created for ${callbackUrl}`);
      
      return newSubscription;
    } catch (error) {
      this.logger.error(`Error setting up webhook subscription: ${error.message}`);
      throw error;
    }
  }
}
