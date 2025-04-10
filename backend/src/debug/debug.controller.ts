import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { CalendlyV2Service } from '../calendly-v2/calendly-v2.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Debug')
@Controller('debug')
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(
    @Inject('IS_DEBUG_ENABLED') private readonly isDebugEnabled: boolean,
    private readonly calendlyV2Service: CalendlyV2Service
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get debug module status' })
  @ApiResponse({ status: 200, description: 'Debug module status' })
  getStatus() {
    this.logger.log('Debug status request received');
    
    return {
      success: true,
      message: 'Debug module is operational',
      debugEnabled: this.isDebugEnabled,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('funnel-steps')
  @ApiOperation({ summary: 'Get funnel steps for debugging' })
  @ApiResponse({ status: 200, description: 'Funnel steps retrieved successfully' })
  async getFunnelSteps() {
    this.logger.log('Debug funnel steps request received');
    
    // Redirection vers l'endpoint existant
    return {
      success: true,
      message: 'Use /api/funnel-steps/debug endpoint for funnel steps data',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('visitors')
  @ApiOperation({ summary: 'Get visitors for debugging' })
  @ApiResponse({ status: 200, description: 'Visitors retrieved successfully' })
  async getVisitors() {
    this.logger.log('Debug visitors request received');
    
    return {
      success: true,
      message: 'Visitors debug endpoint functioning',
      note: 'This endpoint will be fully implemented in the next iteration',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get leads for debugging' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  async getLeads() {
    this.logger.log('Debug leads request received');
    
    return {
      success: true,
      message: 'Leads debug endpoint functioning',
      note: 'This endpoint will be fully implemented in the next iteration',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('touchpoints')
  @ApiOperation({ summary: 'Get touchpoints for debugging' })
  @ApiResponse({ status: 200, description: 'Touchpoints retrieved successfully' })
  async getTouchpoints() {
    this.logger.log('Debug touchpoints request received');
    
    return {
      success: true,
      message: 'Touchpoints debug endpoint functioning',
      note: 'This endpoint will be fully implemented in the next iteration',
      timestamp: new Date().toISOString(),
    };
  }


}
