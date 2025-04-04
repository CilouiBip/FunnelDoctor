import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CalendlyAuthController } from './calendly.auth.controller';
import { CalendlyAuthService } from './calendly.auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from '../common/services/email.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CalendlyV2Module } from '../calendly-v2/calendly-v2.module';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    SupabaseModule,
    HttpModule,
    IntegrationsModule,
    CalendlyV2Module,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [AuthController, CalendlyAuthController],
  providers: [AuthService, CalendlyAuthService, JwtStrategy],
  exports: [AuthService, CalendlyAuthService, JwtStrategy],
})
export class AuthModule {}
