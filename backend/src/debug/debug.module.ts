import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DebugController } from './debug.controller';
import { CalendlyV2Module } from '../calendly-v2/calendly-v2.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

/**
 * Module de debug pour le développement et les tests
 * Ce module fournit des endpoints pour visualiser les données Supabase
 * et faciliter le debug du funnel
 */
@Module({})
export class DebugModule {
  static register(): DynamicModule {
    return {
      module: DebugModule,
      imports: [
        ConfigModule,
        CalendlyV2Module,
        WebhooksModule,
      ],
      controllers: [
        DebugController,
      ],
      providers: [
        {
          provide: 'IS_DEBUG_ENABLED',
          useFactory: (configService: ConfigService) => {
            const nodeEnv = configService.get<string>('NODE_ENV');
            return nodeEnv === 'development' || configService.get<boolean>('DEBUG_MODE', false);
          },
          inject: [ConfigService],
        },
      ],
    };
  }
}
