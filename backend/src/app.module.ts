import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { TrackingLinksModule } from './tracking-links/tracking-links.module';
import { TouchpointsModule } from './touchpoints/touchpoints.module';
import { VisitorsModule } from './visitors/visitors.module';
import { ConversionEventsModule } from './conversion-events/conversion-events.module';
import { FunnelStepsModule } from './funnel-steps/funnel-steps.module';
import { BridgingModule } from './bridging/bridging.module';
import { PaymentsModule } from './payments/payments.module';
import { RdvModule } from './rdv/rdv.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    CampaignsModule,
    TrackingLinksModule,
    TouchpointsModule,
    VisitorsModule,
    ConversionEventsModule,
    FunnelStepsModule,
    BridgingModule,
    PaymentsModule,
    RdvModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api*'],
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
