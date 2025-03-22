import { IsUUID, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateFunnelStepDto {
  @IsUUID(4)
  step_id: string;

  @IsUUID(4)
  @IsOptional()
  user_id?: string;

  @IsString()
  type: string;

  @IsString()
  slug: string;

  @IsString()
  label: string;
  
  @IsString()
  @IsOptional()
  description?: string;
  
  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}

export class UpdateFunnelStepDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;
  
  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
  
  @IsString()
  @IsOptional()
  slug?: string;
  
  @IsString()
  @IsOptional()
  type?: string;
}
