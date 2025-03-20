import { LeadStatus } from '../enums/lead-status.enum';

/**
 * Interface représentant une entrée dans l'historique des statuts d'un lead
 */
export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  user_id: string;
  old_status?: LeadStatus;
  new_status: LeadStatus;
  comment?: string;
  created_at: Date;
}
