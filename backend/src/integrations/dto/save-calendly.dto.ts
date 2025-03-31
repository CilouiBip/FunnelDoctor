import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour enregistrer ou mettre u00e0 jour une intu00e9gration Calendly
 */
export class SaveCalendlyDto {
  @ApiProperty({
    description: "Clu00e9 API Calendly (Personal Access Token)",
    example: "pct_01234567890abcdef"
  })
  @IsNotEmpty({ message: 'La clu00e9 API Calendly est requise' })
  @IsString({ message: 'La clu00e9 API Calendly doit u00eatre une chau00eene de caractu00e8res' })
  apiKey: string;
}
