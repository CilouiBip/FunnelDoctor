import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateTrackingLinkDto {
  @IsString({ message: 'Le nom doit u00eatre une chau00eene de caractu00e8res' })
  @IsOptional()
  name?: string;

  @IsUrl({}, { message: 'Veuillez fournir une URL valide' })
  @IsOptional()
  target_url?: string;

  @IsString()
  @IsOptional()
  campaign_id?: string;

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
}
