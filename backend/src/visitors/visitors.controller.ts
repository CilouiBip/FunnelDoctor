import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { ConvertVisitorDto } from './dto/convert-visitor.dto';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('visitors')
@UseGuards(JwtAuthGuard)
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  /**
   * Cru00e9e ou met u00e0 jour un visiteur
   * Endpoint public, accessible sans authentification
   */
  @Post()
  @Public()
  async createOrUpdate(@Body() createVisitorDto: CreateVisitorDto) {
    return this.visitorsService.createOrUpdate(createVisitorDto);
  }

  /**
   * Ru00e9cupu00e8re un visiteur par son visitor_id
   * Endpoint public, accessible sans authentification
   */
  @Get(':visitorId')
  @Public()
  async findByVisitorId(@Param('visitorId') visitorId: string) {
    return this.visitorsService.findByVisitorId(visitorId);
  }

  /**
   * Convertit un visiteur en lead
   * Endpoint public, accessible sans authentification
   */
  @Post(':visitorId/convert')
  @Public()
  async convertToLead(
    @Param('visitorId') visitorId: string,
    @Body() convertVisitorDto: ConvertVisitorDto
  ) {
    return this.visitorsService.convertToLead(visitorId, convertVisitorDto.lead_id);
  }

  /**
   * Ru00e9cupu00e8re tous les touchpoints d'un visiteur
   * Endpoint public, accessible sans authentification
   */
  @Get(':visitorId/touchpoints')
  @Public()
  async getTouchpoints(@Param('visitorId') visitorId: string) {
    return this.visitorsService.getTouchpoints(visitorId);
  }
}
