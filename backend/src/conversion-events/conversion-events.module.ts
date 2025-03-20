import { Module } from '@nestjs/common';
import { ConversionEventsService } from './conversion-events.service';
import { ConversionEventsController } from './conversion-events.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    SupabaseModule,
    LeadsModule, // Nécessaire pour accéder à LeadStatusService
  ],
  controllers: [ConversionEventsController],
  providers: [ConversionEventsService],
  exports: [ConversionEventsService],
})
export class ConversionEventsModule {}
