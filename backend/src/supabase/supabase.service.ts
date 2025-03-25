import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabaseClient: SupabaseClient;
  private supabaseAdminClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY') || '';
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
      throw new Error('Supabase credentials are missing');
    }

    // Initialisation avec une configuration pour minimiser les problèmes de cache
    this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      // Force de ne pas mettre en cache les réponses HTTP
      global: {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    });
    
    this.supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      db: {
        schema: 'public'
      },
      // Force de ne pas mettre en cache les réponses HTTP
      global: {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    });
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  getAdminClient(): SupabaseClient {
    return this.supabaseAdminClient;
  }
  
  /**
   * Réinitialiser les clients Supabase pour forcer le rafraîchissement du cache de schéma
   */
  public resetClients(): void {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY') || '';
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Recréer les clients avec configuration anti-cache
    this.supabaseClient = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      // Force de ne pas mettre en cache les réponses HTTP
      global: {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    });
    
    this.supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      db: {
        schema: 'public'
      },
      // Force de ne pas mettre en cache les réponses HTTP
      global: {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    });
    
    console.log('Supabase clients reset complete - cache disabled');
  }
}
