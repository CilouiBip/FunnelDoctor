import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BridgingModule } from '../bridging/bridging.module';
import { FunnelProgressModule } from '../funnel-progress/funnel-progress.module';
import { ConfigModule } from '@nestjs/config';
import { TouchpointsModule } from '../touchpoints/touchpoints.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    BridgingModule, 
    ConfigModule, 
    FunnelProgressModule,
    TouchpointsModule,
    LeadsModule
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
