import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';

/**
 * SharedModule contient des services et des utilitaires qui sont utilisés par plusieurs modules
 * afin d'éviter les dépendances circulaires et d'améliorer la cohérence de l'architecture.
 */
@Module({
  imports: [SupabaseModule],
  providers: [],
  exports: [SupabaseModule] // Exporter SupabaseModule pour le rendre disponible aux modules qui importent SharedModule
})
export class SharedModule {}
