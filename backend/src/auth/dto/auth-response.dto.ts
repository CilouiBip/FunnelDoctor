import { User } from '../../users/entities/user.entity';

export class AuthResponseDto {
  user: Omit<User, 'password_hash'>;
  access_token: string;
}
