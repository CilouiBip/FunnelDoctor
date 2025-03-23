import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

// DTO pour la réponse de création de souscription webhook
export class WebhookSubscriptionResponseDto {
  @IsString()
  resource: string;

  @IsString()
  uri: string;

  @IsString()
  callback_url: string;

  @IsString()
  created_at: string;

  @IsString()
  updated_at: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  scope: string; // 'user' ou 'organization'

  @IsArray()
  events: string[];

  @IsString()
  state: string; // 'active', 'disabled', etc.

  @IsObject()
  @IsOptional()
  creator?: Record<string, any>;
}

// DTO pour la création d'une souscription webhook
export class CreateWebhookSubscriptionDto {
  @IsString()
  url: string;

  @IsString()
  scope: 'user' | 'organization';

  @IsArray()
  events: string[];

  @IsString()
  @IsOptional()
  organization_uri?: string;

  @IsString()
  @IsOptional()
  user_uri?: string;

  @IsString()
  @IsOptional()
  signing_key?: string;
}
