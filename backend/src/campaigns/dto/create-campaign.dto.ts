import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCampaignDto {
  @IsString({ message: 'Le nom doit u00eatre une chau00eene de caractu00e8res' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string = 'active';
}
