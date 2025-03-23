import { Module } from '@nestjs/common';
import { VisitorsController } from './visitors.controller';
import { VisitorsService } from './visitors.service';
import { SharedModule } from '../shared/shared.module';

/**
 * Module de gestion des visiteurs
 * Utilise le SharedModule pour éviter les dépendances circulaires
 */
@Module({
  imports: [SharedModule],
  controllers: [VisitorsController],
  providers: [VisitorsService],
  exports: [VisitorsService] // Exporter le service pour qu'il soit utilisable par d'autres modules
})
export class VisitorsModule {}
