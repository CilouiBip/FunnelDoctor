import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTouchpointDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'identifiant du visiteur est requis' })
  visitor_id: string;

  @IsUUID(4)
  @IsOptional()
  tracking_link_id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le type d\'événement est requis' })
  event_type: string;

  @IsObject()
  @IsOptional()
  event_data?: Record<string, any>;

  @IsString()
  @IsOptional()
  page_url?: string;

  @IsString()
  @IsOptional()
  user_agent?: string;
  
  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsUUID(4)
  @IsOptional()
  master_lead_id?: string;
}
