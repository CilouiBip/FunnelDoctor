export interface Touchpoint {
  id: string;
  visitor_id: string;
  tracking_link_id?: string;
  event_type: string;
  event_data?: Record<string, any>;
  page_url?: string;
  user_agent?: string;
  ip_address?: string;
  referrer?: string;
  created_at: Date;
  updated_at: Date;
}
