import { Module } from '@nestjs/common';
import { BridgingService } from './bridging.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],  // Importer SupabaseModule pour utiliser SupabaseService
  providers: [BridgingService],
  exports: [BridgingService],
})
export class BridgingModule {}
