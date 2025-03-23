import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Logger, Request } from '@nestjs/common';
import { LeadsService } from '../services/leads.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async findAll(@Request() req) {
    this.logger.log(`Requête GET /leads - Récupération de tous les leads pour l'utilisateur ${req.user.id}`);
    return this.leadsService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    this.logger.log(`Requête GET /leads/${id} - Récupération d'un lead spécifique`);
    return this.leadsService.findOne(id, req.user.id);
  }

  @Post()
  async create(@Request() req, @Body() createLeadDto: CreateLeadDto) {
    this.logger.log(`Requête POST /leads - Création d'un nouveau lead`);
    this.logger.debug(`Données reçues: ${JSON.stringify(createLeadDto)}`);
    return this.leadsService.create(req.user.id, createLeadDto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Request() req, @Body() updateLeadDto: UpdateLeadDto) {
    this.logger.log(`Requête PATCH /leads/${id} - Mise à jour d'un lead`);
    return this.leadsService.update(id, req.user.id, updateLeadDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    this.logger.log(`Requête DELETE /leads/${id} - Suppression d'un lead`);
    return this.leadsService.remove(id, req.user.id);
  }
}
