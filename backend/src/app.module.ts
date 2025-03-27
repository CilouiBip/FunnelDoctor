import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
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
import { FunnelProgressModule } from './funnel-progress/funnel-progress.module';
import { CalendlyV2Module } from './calendly-v2/calendly-v2.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DebugModule } from './debug/debug.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { JwtExtractionMiddleware } from './common/middleware/jwt-extraction.middleware';
import { join } from 'path';
import { IntegrationsModule } from './integrations/integrations.module';
import { FunnelAnalyticsModule } from './funnel-analytics/funnel-analytics.module';

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
    FunnelProgressModule,
    CalendlyV2Module,
    AnalyticsModule,
    WebhooksModule,
    IntegrationsModule,
    FunnelAnalyticsModule,
    DebugModule.register(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api*'],
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  /**
   * Configuration des middlewares globaux
   */
  configure(consumer: MiddlewareConsumer) {
    console.log('[APP_MODULE] Configuration des middlewares en cours...');
    
    // Application du middleware d'extraction JWT
    // Tout le traitement CORS est géré via app.enableCors() dans main.ts
    consumer
      .apply(JwtExtractionMiddleware)
      .exclude(
        { path: 'api/auth/login', method: RequestMethod.POST },
        { path: 'api/auth/signup', method: RequestMethod.POST },
        { path: 'api/health', method: RequestMethod.GET },
        { path: 'api/debug/*', method: RequestMethod.GET },
        // Exclure TOUTES les requêtes OPTIONS de l'authentification
        { path: '*', method: RequestMethod.OPTIONS }
      )
      .forRoutes('*');
  }
}
