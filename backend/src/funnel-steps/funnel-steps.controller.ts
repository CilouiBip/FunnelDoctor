import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, UnauthorizedException, Logger } from '@nestjs/common';
import { FunnelStepsService } from './funnel-steps.service';
import { CreateFunnelStepDto, UpdateFunnelStepDto } from './funnel-steps.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

// Define a type for the authenticated request with user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

@Controller('funnel-steps')
export class FunnelStepsController {
  private readonly logger = new Logger(FunnelStepsController.name);
  
  constructor(private readonly funnelStepsService: FunnelStepsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: AuthenticatedRequest) {
    this.logger.log(`GET /funnel-steps - Récupération des étapes avec token JWT valide`);
    this.logger.debug(`User ID: ${req.user.id}`);
    
    const userId = req.user.id;
    return this.funnelStepsService.findAll(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createFunnelStepDto: CreateFunnelStepDto, @Req() req: AuthenticatedRequest) {
    this.logger.log(`POST /funnel-steps - Création d'une nouvelle étape avec token JWT valide`);
    this.logger.debug(`User ID: ${req.user.id}`);
    this.logger.debug(`Données reçues: ${JSON.stringify(createFunnelStepDto)}`);
    
    const userId = req.user.id;
    return this.funnelStepsService.create(createFunnelStepDto, userId);
  }

  @Patch(':step_id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('step_id') stepId: string,
    @Body() updateFunnelStepDto: UpdateFunnelStepDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.logger.log(`PATCH /funnel-steps/${stepId} - Mise à jour d'une étape avec token JWT valide`);
    this.logger.debug(`User ID: ${req.user.id}`);
    this.logger.debug(`Données reçues: ${JSON.stringify(updateFunnelStepDto)}`);
    
    const userId = req.user.id;
    return this.funnelStepsService.update(stepId, updateFunnelStepDto, userId);
  }

  @Delete(':step_id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('step_id') stepId: string, @Req() req: AuthenticatedRequest) {
    this.logger.log(`DELETE /funnel-steps/${stepId} - Suppression d'une étape avec token JWT valide`);
    this.logger.debug(`User ID: ${req.user.id}`);
    
    const userId = req.user.id;
    return this.funnelStepsService.remove(stepId, userId);
  }
  
  @Post('positions')
  @UseGuards(JwtAuthGuard)
  async updatePositions(
    @Body() positionUpdates: { step_id: string, position: number }[],
    @Req() req: AuthenticatedRequest,
  ) {
    this.logger.log(`POST /funnel-steps/positions - Mise à jour des positions avec token JWT valide`);
    this.logger.debug(`User ID: ${req.user.id}`);
    this.logger.debug(`Positions reçues: ${JSON.stringify(positionUpdates)}`);
    
    const userId = req.user.id;
    return this.funnelStepsService.updatePositions(positionUpdates, userId);
  }

  @Get('debug')
  async getDebugSteps() {
    this.logger.log(`GET /funnel-steps/debug - Accès en mode debug (sans authentification)`);
    
    // ID utilisateur fixe pour les tests sans authentication
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    return this.funnelStepsService.findAll(testUserId);
  }
}
