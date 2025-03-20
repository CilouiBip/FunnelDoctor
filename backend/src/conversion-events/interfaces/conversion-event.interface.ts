/**
 * Interface pour les u00e9vu00e9nements de conversion
 */
export interface ConversionEvent {
  id: string;
  leadId: string;
  eventType: string;
  eventData?: Record<string, any>;
  amount?: number;
  userId: string;
  createdAt: Date;
}
