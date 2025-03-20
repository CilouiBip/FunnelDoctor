import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateVisitorDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'identifiant du visiteur est requis' })
  visitor_id: string;

  @IsString()
  @IsOptional()
  user_agent?: string;
  
  @IsString()
  @IsOptional()
  ip_address?: string;
  
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
