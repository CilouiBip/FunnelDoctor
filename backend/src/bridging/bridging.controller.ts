import { Body, Controller, Post, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BridgingService } from './bridging.service';
import { AssociateBridgeDto } from './dto/associate-bridge.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Bridging')
@Controller('api/bridge')
export class BridgingController {
  private readonly logger = new Logger(BridgingController.name);

  constructor(private readonly bridgingService: BridgingService) {}

  @Post('associate')
  @Public() // Endpoint public (pas besoin de JWT)
  @ApiOperation({
    summary: 'Associe un email u00e0 un visitor_id',
    description: 'Stocke l\'association entre un email et un visitor_id dans la table bridge_associations',
  })
  @ApiResponse({
    status: 201,
    description: 'Association stocku00e9e avec succu00e8s',
  })
  @ApiResponse({
    status: 400,
    description: 'Donnu00e9es invalides',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur interne du serveur',
  })
  async associateBridge(@Body() dto: AssociateBridgeDto) {
    this.logger.log(`Nouvelle association email=${dto.email} visitor_id=${dto.visitor_id}`);
    return this.bridgingService.createAssociation(dto);
  }
}
