import { Module } from '@nestjs/common';
import { FunnelStepsController } from './funnel-steps.controller';
import { FunnelStepsService } from './funnel-steps.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [FunnelStepsController],
  providers: [FunnelStepsService],
  exports: [FunnelStepsService],
})
export class FunnelStepsModule {}
