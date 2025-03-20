import { IsDate, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTrackingLinkDto {
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @IsUrl({}, { message: 'Veuillez fournir une URL de destination valide' })
  @IsNotEmpty({ message: 'L\'URL de destination est requise' })
  destination_url: string;

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
  
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expired_at?: Date;
}
