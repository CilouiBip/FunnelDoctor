import { LeadStatus } from '../enums/lead-status.enum';

export class Lead {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  source?: any; // JSONB in the database
  status: LeadStatus;
  created_at: Date;
  updated_at: Date;
}
