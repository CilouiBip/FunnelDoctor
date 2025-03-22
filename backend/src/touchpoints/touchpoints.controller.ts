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
    // Log crucial - doit apparaître quelque part
    console.error('████████ TEST LOG TOUCHPOINT REQUEST ████████');
    console.error('PAYLOAD REÇU:', JSON.stringify(request.body));
    console.error('DTO APRÈS VALIDATION:', JSON.stringify(createTouchpointDto));
    console.error('████████ FIN TEST LOG ████████');
    // Debug: Log complet du payload reçu pour débogage
    console.log('DEBUG - Touchpoint payload reçu:', JSON.stringify(request.body, null, 2));
    console.log('DEBUG - DTO après validation:', JSON.stringify(createTouchpointDto, null, 2));
    
    try {
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
      
      console.log('DEBUG - DTO final avant création:', JSON.stringify(createTouchpointDto, null, 2));
      return this.touchpointsService.create(createTouchpointDto);
    } catch (error) {
      console.error('DEBUG - Erreur lors de la création du touchpoint:', error);
      if (error.response) {
        console.error('DEBUG - Détails de l\'erreur:', JSON.stringify(error.response, null, 2));
      }
      throw error;
    }
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
