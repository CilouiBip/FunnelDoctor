import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { TransitionLeadStatusDto } from './dto/transition-lead-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadStatusService } from './services/lead-status.service';
import { LeadStatusHistoryService } from './services/lead-status-history.service';

@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadStatusService: LeadStatusService,
    private readonly leadStatusHistoryService: LeadStatusHistoryService
  ) {}

  @Post()
  create(@Request() req, @Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(req.user.id, createLeadDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.leadsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.leadsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    return this.leadsService.update(req.user.id, id, updateLeadDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.leadsService.remove(req.user.id, id);
  }

  /**
   * Change le statut d'un lead
   * @param req Requête avec l'utilisateur authentifié
   * @param id ID du lead
   * @param transitionDto DTO contenant le nouveau statut et un commentaire optionnel
   * @returns Le lead avec son statut mis à jour
   */
  @Post(':id/transition')
  changeStatus(
    @Request() req, 
    @Param('id') id: string, 
    @Body() transitionDto: TransitionLeadStatusDto
  ) {
    return this.leadStatusService.changeLeadStatus(
      req.user.id, 
      id, 
      transitionDto.status, 
      transitionDto.comment
    );
  }

  /**
   * Récupère l'historique des statuts d'un lead
   * @param req Requête avec l'utilisateur authentifié
   * @param id ID du lead
   * @returns L'historique des statuts du lead
   */
  @Get(':id/status-history')
  getStatusHistory(@Request() req, @Param('id') id: string) {
    return this.leadStatusHistoryService.getLeadStatusHistory(req.user.id, id);
  }
}
