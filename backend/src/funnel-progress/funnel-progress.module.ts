import { Module } from '@nestjs/common';
import { FunnelProgressService } from './funnel-progress.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  providers: [FunnelProgressService],
  exports: [FunnelProgressService]
})
export class FunnelProgressModule {}
