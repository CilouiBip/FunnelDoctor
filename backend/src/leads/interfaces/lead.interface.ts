/**
 * Interface repru00e9sentant un lead dans le systu00e8me
 */
export interface Lead {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  status?: string;
  status_id?: string;
  source?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
  user_id?: string;
  phone?: string;
}
