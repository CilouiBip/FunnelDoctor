import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsUUID } from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est requis' })
  full_name: string;

  @IsString()
  @IsOptional()
  company_name?: string;
  
  @IsUUID(4, { message: 'ID de plan invalide' })
  @IsOptional()
  plan_id?: string;
}
