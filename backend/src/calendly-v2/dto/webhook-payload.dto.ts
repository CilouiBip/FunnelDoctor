import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

/**
 * Structure des données d'événement reçues dans le webhook Calendly
 */
export class CalendlyEventTypeDto {
  @IsString()
  @IsOptional()
  name?: string;
  
  @IsString()
  @IsOptional()
  uuid?: string;
}

/**
 * Structure pour les données d'invité
 */
export class CalendlyInviteeDto {
  @IsString()
  email: string;
  
  @IsString()
  @IsOptional()
  name?: string;
  
  @IsString()
  @IsOptional()
  timezone?: string;
  
  @IsString()
  @IsOptional()
  uuid?: string;
}

/**
 * Structure pour les données d'événement programmé
 */
export class CalendlyScheduledEventDto {
  @IsString()
  @IsOptional()
  uuid?: string;
  
  @IsString()
  @IsOptional()
  uri?: string;
  
  @IsString()
  @IsOptional()
  start_time?: string;
  
  @IsString()
  @IsOptional()
  end_time?: string;
  
  @IsString()
  @IsOptional()
  id?: string;
  
  @IsString()
  @IsOptional()
  organization?: string;
}

/**
 * Structure pour les données de tracking
 */
export class CalendlyTrackingDto {
  @IsString()
  @IsOptional()
  utm_source?: string;
  
  @IsString()
  @IsOptional()
  utm_medium?: string;
  
  @IsString()
  @IsOptional()
  utm_campaign?: string;
  
  @IsString()
  @IsOptional()
  utm_content?: string;
  
  @IsString()
  @IsOptional()
  utm_term?: string;
  
  @IsString()
  @IsOptional()
  utm_visitor_id?: string; // Utilisé pour stocker le visitor_id
  
  @IsString()
  @IsOptional()
  salesforce_uuid?: string;
}

/**
 * Structure pour l'utilisateur Calendly
 */
export class CalendlyUserDto {
  @IsString()
  @IsOptional()
  uri?: string;
  
  @IsString()
  @IsOptional()
  email?: string;
  
  @IsString()
  @IsOptional()
  name?: string;
}

/**
 * Structure pour les données d'annulation
 */
export class CancellationDto {
  @IsString()
  @IsOptional()
  reason?: string;
  
  @IsString()
  @IsOptional()
  canceler_type?: 'invitee' | 'host';
  
  @IsString()
  @IsOptional()
  canceled_by?: string; // URI de la personne qui a annulé
}

/**
 * Structure pour le contenu du payload
 */
export class CalendlyPayloadDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CalendlyEventTypeDto)
  @IsOptional()
  event_type?: CalendlyEventTypeDto;
  
  @IsObject()
  @ValidateNested()
  @Type(() => CalendlyInviteeDto)
  @IsOptional()
  invitee?: CalendlyInviteeDto;
  
  @IsObject()
  @ValidateNested()
  @Type(() => CalendlyScheduledEventDto)
  @IsOptional()
  scheduled_event?: CalendlyScheduledEventDto;
  
  @IsObject()
  @ValidateNested()
  @Type(() => CalendlyTrackingDto)
  @IsOptional()
  tracking?: CalendlyTrackingDto;
  
  @IsObject()
  @ValidateNested()
  @Type(() => CancellationDto)
  @IsOptional()
  cancellation?: CancellationDto; // Présent uniquement pour les événements invitee.canceled
  
  @IsString()
  @IsOptional()
  organization?: string;
  
  @IsObject()
  @ValidateNested()
  @Type(() => CalendlyUserDto)
  @IsOptional()
  user?: CalendlyUserDto;
}

/**
 * DTO pour les événements webhook Calendly adaptés à la structure réelle
 */
export class CalendlyWebhookPayloadDto {
  @IsString()
  event: string; // 'invitee.created', 'invitee.canceled', etc.
  
  @IsObject()
  @ValidateNested()
  @Type(() => CalendlyPayloadDto)
  payload: CalendlyPayloadDto;
}
