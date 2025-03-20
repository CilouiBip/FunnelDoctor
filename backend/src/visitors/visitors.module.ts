import { Module } from '@nestjs/common';
import { VisitorsController } from './visitors.controller';
import { VisitorsService } from './visitors.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [SupabaseModule, LeadsModule],
  controllers: [VisitorsController],
  providers: [VisitorsService],
  exports: [VisitorsService], // Exporter le service pour qu'il soit utilisable par d'autres modules
})
export class VisitorsModule {}
