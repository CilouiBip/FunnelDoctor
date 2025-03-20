import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { LeadStatusService } from './services/lead-status.service';
import { LeadStatusHistoryService } from './services/lead-status-history.service';

@Module({
  imports: [SupabaseModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadStatusService, LeadStatusHistoryService],
  exports: [LeadsService, LeadStatusService, LeadStatusHistoryService],
})
export class LeadsModule {}
