import { IsOptional, IsString } from 'class-validator';

export class UpdateCampaignDto {
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
