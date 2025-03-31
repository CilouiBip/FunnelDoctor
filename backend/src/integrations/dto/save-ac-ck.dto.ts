import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour enregistrer ou mettre u00e0 jour une intu00e9gration ActiveCampaign ou ConvertKit
 */
export class SaveAcCkDto {
  @ApiProperty({
    description: "Clu00e9 API pour ActiveCampaign ou ConvertKit",
    example: "ac_1234abcd56789efgh"
  })
  @IsNotEmpty({ message: 'La clu00e9 API est requise' })
  @IsString({ message: 'La clu00e9 API doit u00eatre une chau00eene de caractu00e8res' })
  apiKey: string;

  @ApiProperty({
    description: "URL de l'API (requis uniquement pour ActiveCampaign)",
    example: "https://account.api-us1.com",
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: "L'URL de l'API doit u00eatre une URL valide" })
  apiUrl?: string;

  @ApiProperty({
    description: "Type d'intu00e9gration (ActiveCampaign ou ConvertKit)",
    enum: ['ac', 'ck'],
    example: "ac"
  })
  @IsNotEmpty({ message: 'Le type est requis' })
  @IsEnum(['ac', 'ck'], { message: "Le type doit u00eatre 'ac' ou 'ck'" })
  type: 'ac' | 'ck';
}
