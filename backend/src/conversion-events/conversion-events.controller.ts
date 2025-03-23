import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ConversionEventsService } from './conversion-events.service';
import { CreateConversionEventDto } from './dto/create-conversion-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('conversion-events')
@UseGuards(JwtAuthGuard)
export class ConversionEventsController {
  constructor(private readonly conversionEventsService: ConversionEventsService) {}

  /**
   * Cru00e9e un nouvel u00e9vu00e9nement de conversion
   * @param createDto Donnu00e9es de l'u00e9vu00e9nement de conversion
   * @param req Requ00eate HTTP (contient les infos utilisateur)
   * @returns L'u00e9vu00e9nement de conversion cru00e9u00e9
   */
  @Post()
  async create(@Body() createDto: CreateConversionEventDto, @Request() req) {
    const userId = req.user.id;
    return this.conversionEventsService.create(createDto, userId);
  }

  /**
   * Ru00e9cupu00e8re tous les u00e9vu00e9nements de conversion d'un lead
   * @param leadId ID du lead
   * @returns Liste des u00e9vu00e9nements de conversion
   */
  @Get('lead/:id')
  async findByLeadId(@Param('id') leadId: string) {
    return this.conversionEventsService.findByLeadId(leadId);
  }

  /**
   * Ru00e9cupu00e8re les statistiques sur les u00e9vu00e9nements de conversion
   * @returns Statistiques agru00e9gu00e9es
   */
  @Get('stats')
  async getStats() {
    return this.conversionEventsService.getStats();
  }
}
