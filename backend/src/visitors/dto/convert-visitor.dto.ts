import { IsNotEmpty, IsUUID } from 'class-validator';

export class ConvertVisitorDto {
  @IsUUID(4)
  @IsNotEmpty({ message: 'L\'identifiant du lead est requis' })
  lead_id: string;
}
