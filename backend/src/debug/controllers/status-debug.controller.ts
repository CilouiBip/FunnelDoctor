import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DebugService } from '../debug.service';

@ApiTags('Debug - Status')
@Controller('api/debug/status')
export class StatusDebugController {
  private readonly logger = new Logger(StatusDebugController.name);

  constructor(private readonly debugService: DebugService) {}

  @Get()
  @ApiOperation({ summary: 'Get system status and data overview' })
  @ApiResponse({ status: 200, description: 'Status information retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Debug mode disabled in production' })
  async getStatus() {
    this.logger.log('Debug status request received');
    return this.debugService.getSystemStatus();
  }
}
