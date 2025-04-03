import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CalendlyV2Service } from './calendly-v2.service';
import { CalendlyV2SubscriptionService } from './calendly-v2-subscription.service';
import { CalendlyV2WebhookController } from './calendly-v2-webhook.controller';
import { CalendlyV2SetupController } from './calendly-v2-setup.controller';
// Imports des contrôleurs de test/environnement supprimés (fichiers manquants)
import { BridgingModule } from '../bridging/bridging.module';
import { TouchpointsModule } from '../touchpoints/touchpoints.module';
import { FunnelProgressModule } from '../funnel-progress/funnel-progress.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { LeadsModule } from '../leads/leads.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    BridgingModule,
    TouchpointsModule,
    FunnelProgressModule,
    SupabaseModule,
    ConfigModule,
    LeadsModule,
    IntegrationsModule,
  ],
  controllers: [CalendlyV2WebhookController, CalendlyV2SetupController],
  providers: [CalendlyV2Service, CalendlyV2SubscriptionService],
  exports: [CalendlyV2Service, CalendlyV2SubscriptionService],
})
export class CalendlyV2Module {}
