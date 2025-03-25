import { IsString, IsOptional, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class TrackingDto {
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
  visitor_id?: string;
}

export class CalendlyWebhookDto {
  @IsString()
  email: string;
  
  @IsString()
  @IsOptional()
  name?: string;
  
  @IsString()
  @IsOptional()
  event_type?: string;
  
  @IsString()
  @IsOptional()
  event_status?: string;
  
  @IsOptional()
  canceled?: boolean;
  
  @IsOptional()
  rescheduled?: boolean;
  
  @IsString()
  @IsOptional()
  event_start_time?: string;
  
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => TrackingDto)
  tracking?: TrackingDto;
}

class MetadataDto {
  @IsString()
  @IsOptional()
  lead_id?: string;
  
  @IsString()
  @IsOptional()
  visitor_id?: string;
}

export class StripeWebhookDto {
  @IsString()
  @IsOptional()
  id?: string;
  
  @IsNumber()
  @IsOptional()
  amount?: number;
  
  @IsString()
  @IsOptional()
  currency?: string;
  
  @IsString()
  @IsOptional()
  status?: string;
  
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;
}
