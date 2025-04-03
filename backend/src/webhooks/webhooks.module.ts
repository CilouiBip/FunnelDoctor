import { Module, Logger } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { UsersModule } from '../users/users.module';
import { LeadsModule } from '../leads/leads.module';
import { TouchpointsModule } from '../touchpoints/touchpoints.module';

@Module({
  imports: [
    UsersModule,
    LeadsModule,
    TouchpointsModule
  ],
  controllers: [WebhooksController],
  providers: [Logger, WebhooksService],
  exports: [WebhooksService]
})
export class WebhooksModule {}
