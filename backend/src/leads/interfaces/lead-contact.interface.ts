/**
 * Interface pour les contacts normalisés des leads (Phase 2)
 */
export interface LeadContact {
  id: string;
  leadId: string;
  contactType: 'email' | 'phone' | 'address' | 'social' | string;
  contactValue: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
