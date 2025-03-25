import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DebugService } from '../debug.service';

@ApiTags('Debug - Funnel Progress')
@Controller('api/debug/funnel-progress')
export class FunnelProgressDebugController {
  private readonly logger = new Logger(FunnelProgressDebugController.name);

  constructor(private readonly debugService: DebugService) {}

  @Get()
  @ApiOperation({ summary: 'Get funnel progress data for debugging' })
  @ApiResponse({ status: 200, description: 'Funnel progress data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Debug mode disabled in production' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'visitor_id', required: false, type: String })
  @ApiQuery({ name: 'lead_id', required: false, type: String })
  @ApiQuery({ name: 'step_id', required: false, type: String })
  async getFunnelProgress(
    @Query('limit') limit?: number,
    @Query('user_id') userId?: string,
    @Query('visitor_id') visitorId?: string,
    @Query('lead_id') leadId?: string,
    @Query('step_id') stepId?: string,
  ) {
    this.logger.log(`Debug funnel progress request received: limit=${limit}, user_id=${userId}, visitor_id=${visitorId}, lead_id=${leadId}, step_id=${stepId}`);
    return this.debugService.getTableData('funnel_progress', limit, {
      user_id: userId,
      visitor_id: visitorId,
      lead_id: leadId,
      step_id: stepId,
    });
  }
}
