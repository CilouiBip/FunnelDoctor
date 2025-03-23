/**
 * Étapes du funnel de conversion, standardisées pour Phase 2
 */
export enum FunnelStage {
  VISIT = 'visit',
  LEAD_CAPTURE = 'lead_capture',
  RDV_SCHEDULED = 'rdv_scheduled',
  RDV_CANCELED = 'rdv_canceled',
  RDV_COMPLETED = 'rdv_completed',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost'
}
