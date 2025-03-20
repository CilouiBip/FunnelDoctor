export class TrackingLink {
  id: string;
  user_id: string;
  short_code: string;
  destination_url: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  created_at: Date;
  expired_at?: Date;
}
