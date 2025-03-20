import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'Le mot de passe doit u00eatre une chau00eene de caractu00e8res' })
  @IsOptional()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractu00e8res' })
  password?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;
}
