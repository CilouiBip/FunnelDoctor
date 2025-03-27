import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { EventsAnalyticsService } from './services/events-analytics.service';
import { FunnelAnalyticsService } from './services/funnel-analytics.service';
import { LeadsAnalyticsService } from './services/leads-analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';

/**
 * Module principal pour l'analyse des donnu00e9es
 * Fournit des services pour analyser les u00e9vu00e9nements, le funnel et les leads
 */
@Module({
  imports: [
    SupabaseModule, // Du00e9pendance vers le module Supabase pour l'accu00e8s aux donnu00e9es
  ],
  controllers: [
    AnalyticsController
  ],
  providers: [
    EventsAnalyticsService,
    FunnelAnalyticsService,
    LeadsAnalyticsService,
  ],
  exports: [
    EventsAnalyticsService,
    FunnelAnalyticsService,
    LeadsAnalyticsService
  ],
})
export class AnalyticsModule {}
