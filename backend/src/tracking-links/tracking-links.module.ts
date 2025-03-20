import { Module } from '@nestjs/common';
import { TrackingLinksService } from './tracking-links.service';
import { TrackingLinksController } from './tracking-links.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [TrackingLinksController],
  providers: [TrackingLinksService],
  exports: [TrackingLinksService],
})
export class TrackingLinksModule {}
