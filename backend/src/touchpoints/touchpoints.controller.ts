import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TouchpointsService } from './touchpoints.service';
import { CreateTouchpointDto } from './dto/create-touchpoint.dto';
import { Touchpoint } from './interfaces/touchpoint.interface';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('touchpoints')
@UseGuards(JwtAuthGuard)
export class TouchpointsController {
  constructor(private readonly touchpointsService: TouchpointsService) {}

  /**
   * Créer un nouveau touchpoint - Endpoint public accessible sans authentification
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTouchpointDto: CreateTouchpointDto,
    @Ip() ip: string,
    @Req() request: Request
  ): Promise<Touchpoint> {
    // Ajouter l'adresse IP du client si elle n'est pas fournie
    if (!createTouchpointDto.ip_address) {
      createTouchpointDto.ip_address = ip;
    }
    
    // Ajouter le user-agent si non fourni et disponible dans la requête
    if (!createTouchpointDto.user_agent && request.headers['user-agent']) {
      createTouchpointDto.user_agent = request.headers['user-agent'] as string;
    }
    
    // Ajouter le referrer si non fourni et disponible dans la requête
    if (!createTouchpointDto.referrer && request.headers.referer) {
      createTouchpointDto.referrer = request.headers.referer as string;
    }
    
    return this.touchpointsService.create(createTouchpointDto);
  }

  /**
   * Récupérer tous les touchpoints avec pagination optionnelle - Endpoint protégé par JWT
   */
  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ): Promise<{ data: Touchpoint[]; count: number }> {
    return this.touchpointsService.findAll(Number(page), Number(limit));
  }

  /**
   * Récupérer un touchpoint spécifique par son ID - Endpoint protégé par JWT
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Touchpoint> {
    return this.touchpointsService.findOne(id);
  }

  /**
   * Récupérer tous les touchpoints pour un visiteur spécifique - Endpoint protégé par JWT
   */
  @Get('visitor/:visitorId')
  async findByVisitorId(@Param('visitorId') visitorId: string): Promise<Touchpoint[]> {
    return this.touchpointsService.findByVisitorId(visitorId);
  }
}
