/**
 * Interface représentant un visiteur dans le système
 */
export interface Visitor {
  id: string;
  visitor_id: string;
  first_seen_at: Date;
  last_seen_at: Date;
  user_agent?: string;
  ip_address?: string;
  lead_id?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
