import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateLeadDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsObject()
  @IsOptional()
  source?: Record<string, any>;

  @IsString()
  @IsOptional()
  status?: string;
}
