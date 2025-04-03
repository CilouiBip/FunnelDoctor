import { Module, Logger } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  controllers: [WebhooksController],
  providers: [Logger, WebhooksService],
  exports: [WebhooksService]
})
export class WebhooksModule {}
