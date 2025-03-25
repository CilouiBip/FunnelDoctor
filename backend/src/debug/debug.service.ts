import { Injectable, Inject, Logger, ForbiddenException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DebugService {
  private readonly supabase: SupabaseClient;
  private readonly logger = new Logger(DebugService.name);

  constructor(
    @Inject('IS_DEBUG_ENABLED') private readonly isDebugEnabled: boolean,
    private readonly configService: ConfigService,
  ) {
    if (this.isDebugEnabled) {
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') || 
                          this.configService.get<string>('SUPABASE_ANON_KEY');
      if (!supabaseUrl || !supabaseKey) {
        this.logger.error('Supabase credentials are not properly configured');
        throw new Error('Supabase credentials are not properly configured');
      }
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('Debug service initialized in development mode');
    } else {
      this.logger.warn('Debug service initialized in production mode - most functions will be restricted');
    }
  }

  private checkDebugMode() {
    if (!this.isDebugEnabled) {
      throw new ForbiddenException('Debug mode is disabled in production for security reasons');
    }
  }

  async getTableData(tableName: string, limit: number = 100, filters: Record<string, any> = {}) {
    this.checkDebugMode();
    
    try {
      this.logger.debug(`Fetching debug data from ${tableName} with filters: ${JSON.stringify(filters)}`);
      
      let query = this.supabase
        .from(tableName)
        .select('*')
        .limit(limit);
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
      
      const { data, error } = await query;
      
      if (error) {
        this.logger.error(`Error fetching data from ${tableName}: ${error.message}`);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      this.logger.error(`Exception when fetching data from ${tableName}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getSystemStatus() {
    this.checkDebugMode();
    
    try {
      const tables = [
        'visitors',
        'leads',
        'touchpoints',
        'conversion_events',
        'funnel_steps',
        'funnel_progress'
      ];
      
      const statusPromises = tables.map(async (table) => {
        const { data, error } = await this.supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        return {
          table,
          count: error ? null : data?.[0]?.count || 0,
          error: error ? error.message : null,
          hasData: error ? false : (data?.[0]?.count > 0),
        };
      });
      
      const statuses = await Promise.all(statusPromises);
      
      // Check DB connection
      const isDbConnected = statuses.every(status => status.error === null);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        isDbConnected,
        environment: this.configService.get<string>('NODE_ENV'),
        debugMode: this.isDebugEnabled,
        tables: statuses,
      };
    } catch (error) {
      this.logger.error(`Exception when fetching system status: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        debugMode: this.isDebugEnabled,
      };
    }
  }
}
