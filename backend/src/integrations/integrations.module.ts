import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { SupabaseModule } from '../supabase/supabase.module';
import { EncryptionService } from './encryption/encryption.service';
import { IntegrationService } from './integration.service';
import { YouTubeAuthService } from './youtube/youtube-auth.service';
import { YouTubeController } from './youtube/youtube.controller';
import { YouTubeTokenRefreshService } from './youtube/youtube-token-refresh.service';
import { YouTubeAnalyticsService } from './youtube/youtube-analytics.service';

@Module({
  imports: [
    SupabaseModule,
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [YouTubeController],
  providers: [
    EncryptionService,
    IntegrationService,
    YouTubeAuthService,
    YouTubeTokenRefreshService,
    YouTubeAnalyticsService,
  ],
  exports: [
    EncryptionService,
    IntegrationService,
    YouTubeAuthService,
    YouTubeAnalyticsService,
  ],
})
export class IntegrationsModule {}
