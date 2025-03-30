import { Module } from '@nestjs/common';
import { LeadsService } from './services/leads.service';
import { MasterLeadService } from './services/master-lead.service';
import { LeadsController } from './controllers/leads.controller';
import { LeadContactsService } from './services/lead-contacts.service';
import { LeadStatusService } from './services/lead-status.service';
import { LeadStatusHistoryService } from './services/lead-status-history.service';
import { SharedModule } from '../shared/shared.module';

/**
 * Module de gestion des leads
 * Utilise le SharedModule pour éviter les dépendances circulaires
 */
@Module({
  imports: [SharedModule],
  controllers: [LeadsController],
  providers: [
    LeadsService, 
    LeadContactsService, 
    LeadStatusService, 
    LeadStatusHistoryService,
    MasterLeadService
  ],
  exports: [
    LeadsService, 
    LeadContactsService, 
    LeadStatusService, 
    LeadStatusHistoryService,
    MasterLeadService
  ]
})
export class LeadsModule {}
