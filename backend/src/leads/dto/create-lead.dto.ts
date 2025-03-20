import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email: string;

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
  status?: string = 'new';
}
