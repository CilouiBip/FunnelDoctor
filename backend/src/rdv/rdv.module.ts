import { Module } from '@nestjs/common';
import { RdvController } from './rdv.controller';
import { RdvService } from './rdv.service';
import { BridgingModule } from '../bridging/bridging.module';
// Le CalendlyWebhookController V1 a u00e9tu00e9 supprimu00e9 et remplau00e7u00e9 par CalendlyV2WebhookController
import { TouchpointsModule } from '../touchpoints/touchpoints.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { FunnelProgressModule } from '../funnel-progress/funnel-progress.module';
import { LeadsModule } from '../leads/leads.module'; // Import pour accéder à MasterLeadService

@Module({
  imports: [
    BridgingModule, 
    TouchpointsModule, 
    SupabaseModule, 
    FunnelProgressModule,
    LeadsModule // Ajout pour rendre MasterLeadService disponible
  ],
  controllers: [RdvController], // CalendlyWebhookController V1 a u00e9tu00e9 supprimu00e9
  providers: [RdvService],
  exports: [RdvService],
})
export class RdvModule {}
