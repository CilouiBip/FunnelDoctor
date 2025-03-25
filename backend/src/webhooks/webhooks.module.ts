import { Module, Logger } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [WebhooksController],
  providers: [Logger],
})
export class WebhooksModule {}
