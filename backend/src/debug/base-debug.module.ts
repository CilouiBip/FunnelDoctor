import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Module de debug pour le développement et les tests
 * Ce module fournit des endpoints pour visualiser les données Supabase
 * et faciliter le debug du funnel
 */
@Module({})
export class BaseDebugModule {
  static register(): DynamicModule {
    return {
      module: BaseDebugModule,
      imports: [
        ConfigModule,
      ],
      controllers: [
        // Contrôleurs ajoutés progressivement
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
