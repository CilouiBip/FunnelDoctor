import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { FunnelAnalyticsService } from './services/funnel-analytics.service';
import { FunnelAnalyticsController } from './funnel-analytics.controller';

/**
 * Module responsable de l'analyse des conversions du funnel,
 * notamment pour les vidéos YouTube
 */
@Module({
  imports: [
    SupabaseModule, // Dépendance vers le module Supabase pour l'accès aux données
  ],
  controllers: [
    FunnelAnalyticsController
  ],
  providers: [
    FunnelAnalyticsService
  ],
  exports: [
    FunnelAnalyticsService
  ]
})
export class FunnelAnalyticsModule {}
