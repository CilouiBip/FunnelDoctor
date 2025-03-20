import { Module } from '@nestjs/common';
import { TouchpointsController } from './touchpoints.controller';
import { TouchpointsService } from './touchpoints.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { VisitorsModule } from '../visitors/visitors.module';

@Module({
  imports: [SupabaseModule, VisitorsModule],
  controllers: [TouchpointsController],
  providers: [TouchpointsService],
  exports: [TouchpointsService]
})
export class TouchpointsModule {}
