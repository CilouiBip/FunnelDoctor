import { Module } from '@nestjs/common';
import { RdvController } from './rdv.controller';
import { RdvService } from './rdv.service';
import { BridgingModule } from '../bridging/bridging.module';

@Module({
  imports: [BridgingModule],
  controllers: [RdvController],
  providers: [RdvService],
  exports: [RdvService],
})
export class RdvModule {}
