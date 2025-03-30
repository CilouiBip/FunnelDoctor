import { Module } from '@nestjs/common';
import { BridgingService } from './bridging.service';
import { BridgingController } from './bridging.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],  // Importer SupabaseModule pour utiliser SupabaseService
  controllers: [BridgingController],
  providers: [BridgingService],
  exports: [BridgingService],
})
export class BridgingModule {}
