import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DebugService } from '../debug.service';

@ApiTags('Debug - Leads')
@Controller('api/debug/leads')
export class LeadsDebugController {
  private readonly logger = new Logger(LeadsDebugController.name);

  constructor(private readonly debugService: DebugService) {}

  @Get()
  @ApiOperation({ summary: 'Get leads data for debugging' })
  @ApiResponse({ status: 200, description: 'Leads data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Debug mode disabled in production' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'visitor_id', required: false, type: String })
  @ApiQuery({ name: 'lead_id', required: false, type: String })
  async getLeads(
    @Query('limit') limit?: number,
    @Query('user_id') userId?: string,
    @Query('visitor_id') visitorId?: string,
    @Query('lead_id') leadId?: string,
  ) {
    this.logger.log(`Debug leads request received: limit=${limit}, user_id=${userId}, visitor_id=${visitorId}, lead_id=${leadId}`);
    return this.debugService.getTableData('leads', limit, {
      user_id: userId,
      visitor_id: visitorId,
      lead_id: leadId,
    });
  }
}
