import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour enregistrer ou mettre u00e0 jour une intu00e9gration Stripe
 */
export class SaveStripeDto {
  @ApiProperty({
    description: "Clu00e9 publique Stripe (Publishable Key)",
    example: "pk_test_abc123"
  })
  @IsNotEmpty({ message: 'La clu00e9 publique Stripe est requise' })
  @IsString({ message: 'La clu00e9 publique Stripe doit u00eatre une chau00eene de caractu00e8res' })
  publishableKey: string;

  @ApiProperty({
    description: "Clu00e9 secru00e8te Stripe (Secret Key)",
    example: "sk_test_xyz789"
  })
  @IsNotEmpty({ message: 'La clu00e9 secru00e8te Stripe est requise' })
  @IsString({ message: 'La clu00e9 secru00e8te Stripe doit u00eatre une chau00eene de caractu00e8res' })
  secretKey: string;
}
