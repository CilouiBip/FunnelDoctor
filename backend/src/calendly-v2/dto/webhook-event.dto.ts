import { IsBoolean, IsDate, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Structure pour les informations de tracking (UTM, etc.)
export class TrackingInfoDto {
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
  fd_tlid?: string; // Champ personnalisé pour visitor_id
}

// Structure pour les informations de paiement
export class PaymentInfoDto {
  @IsBoolean()
  paid: boolean;

  @IsString()
  @IsOptional()
  stripe_transaction_id?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  payment_status?: string;
}

// Structure pour les informations d'invité
export class InviteeInfoDto {
  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  created_at?: Date;

  @IsString()
  @IsOptional()
  uuid?: string;
}

// Structure pour les informations de l'événement planifié
export class ScheduledEventInfoDto {
  @IsString()
  uuid: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsDate()
  @Type(() => Date)
  start_time: Date;

  @IsDate()
  @Type(() => Date)
  end_time: Date;

  @IsString()
  @IsOptional()
  uri?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  rescheduled?: boolean;
}

// Structure principale pour la ressource
export class CalendlyResourceDto {
  @IsObject()
  @ValidateNested()
  @Type(() => TrackingInfoDto)
  @IsOptional()
  tracking?: TrackingInfoDto;

  @IsObject()
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  @IsOptional()
  payment_info?: PaymentInfoDto;

  @IsObject()
  @ValidateNested()
  @Type(() => InviteeInfoDto)
  invitee: InviteeInfoDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ScheduledEventInfoDto)
  scheduled_event: ScheduledEventInfoDto;

  @IsBoolean()
  @IsOptional()
  canceled?: boolean;

  @IsString()
  @IsOptional()
  cancellation_reason?: string;
}

// DTO principal pour les événements webhook Calendly v2
export class CalendlyWebhookEventDto {
  @IsString()
  event: string; // 'invitee.created', 'invitee.canceled', etc.

  @IsString()
  created_at: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CalendlyResourceDto)
  resource: CalendlyResourceDto;
}
