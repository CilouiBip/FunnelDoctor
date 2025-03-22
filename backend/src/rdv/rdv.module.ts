import { Module } from '@nestjs/common';
import { RdvController } from './rdv.controller';
import { RdvService } from './rdv.service';
import { BridgingModule } from '../bridging/bridging.module';
import { CalendlyWebhookController } from './calendly-webhook.controller';
import { TouchpointsModule } from '../touchpoints/touchpoints.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { FunnelProgressModule } from '../funnel-progress/funnel-progress.module';

@Module({
  imports: [BridgingModule, TouchpointsModule, SupabaseModule, FunnelProgressModule],
  controllers: [RdvController, CalendlyWebhookController],
  providers: [RdvService],
  exports: [RdvService],
})
export class RdvModule {}
