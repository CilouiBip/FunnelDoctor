import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DebugService } from '../debug.service';

@ApiTags('Debug - Conversion Events')
@Controller('api/debug/conversion-events')
export class ConversionEventsDebugController {
  private readonly logger = new Logger(ConversionEventsDebugController.name);

  constructor(private readonly debugService: DebugService) {}

  @Get()
  @ApiOperation({ summary: 'Get conversion events data for debugging' })
  @ApiResponse({ status: 200, description: 'Conversion events data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Debug mode disabled in production' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'visitor_id', required: false, type: String })
  @ApiQuery({ name: 'lead_id', required: false, type: String })
  @ApiQuery({ name: 'event_type', required: false, type: String })
  async getConversionEvents(
    @Query('limit') limit?: number,
    @Query('user_id') userId?: string,
    @Query('visitor_id') visitorId?: string,
    @Query('lead_id') leadId?: string,
    @Query('event_type') eventType?: string,
  ) {
    this.logger.log(`Debug conversion events request received: limit=${limit}, user_id=${userId}, visitor_id=${visitorId}, lead_id=${leadId}, event_type=${eventType}`);
    return this.debugService.getTableData('conversion_events', limit, {
      user_id: userId,
      visitor_id: visitorId,
      lead_id: leadId,
      event_type: eventType,
    });
  }
}
