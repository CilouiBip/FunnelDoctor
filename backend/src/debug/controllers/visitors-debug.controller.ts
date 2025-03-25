import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DebugService } from '../debug.service';

@ApiTags('Debug - Visitors')
@Controller('api/debug/visitors')
export class VisitorsDebugController {
  private readonly logger = new Logger(VisitorsDebugController.name);

  constructor(private readonly debugService: DebugService) {}

  @Get()
  @ApiOperation({ summary: 'Get visitors data for debugging' })
  @ApiResponse({ status: 200, description: 'Visitors data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Debug mode disabled in production' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'visitor_id', required: false, type: String })
  async getVisitors(
    @Query('limit') limit?: number,
    @Query('user_id') userId?: string,
    @Query('visitor_id') visitorId?: string,
  ) {
    this.logger.log(`Debug visitors request received: limit=${limit}, user_id=${userId}, visitor_id=${visitorId}`);
    return this.debugService.getTableData('visitors', limit, {
      user_id: userId,
      visitor_id: visitorId,
    });
  }
}
