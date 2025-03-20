import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsUUID } from 'class-validator';
import { ConversionEventType } from '../enums/conversion-event-type.enum';

/**
 * DTO pour la cru00e9ation d'un u00e9vu00e9nement de conversion
 */
export class CreateConversionEventDto {
  @IsNotEmpty()
  @IsUUID()
  leadId: string;

  @IsNotEmpty()
  @IsEnum(ConversionEventType)
  eventType: ConversionEventType;

  @IsOptional()
  @IsObject()
  eventData?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  comment?: string;
}
