import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption/encryption.service';
import { IntegrationService } from './integration.service';
import { YouTubeAuthService } from './youtube/youtube-auth.service';
import { YouTubeController } from './youtube/youtube.controller';
import { YouTubeTokenRefreshService } from './youtube/youtube-token-refresh.service';
import { YouTubeAnalyticsService } from './youtube/youtube-analytics.service';
import { YouTubeDataService } from './youtube/youtube-data.service';
import { YouTubeStorageService } from './youtube/youtube-storage.service';
import { YouTubeDataController } from './youtube/youtube-data.controller';
import { YouTubeDataTestController } from './youtube/youtube-data-test.controller';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    ScheduleModule.forRoot(),
    HttpModule,
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
  controllers: [YouTubeController, YouTubeDataController, YouTubeDataTestController],
  providers: [
    EncryptionService,
    IntegrationService,
    YouTubeAuthService,
    YouTubeTokenRefreshService,
    YouTubeAnalyticsService,
    YouTubeDataService,
    YouTubeStorageService,
  ],
  exports: [
    EncryptionService,
    IntegrationService,
    YouTubeAuthService,
    YouTubeAnalyticsService,
    YouTubeDataService,
    YouTubeStorageService,
  ],
})
export class IntegrationsModule {}
