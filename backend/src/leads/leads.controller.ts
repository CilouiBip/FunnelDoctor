import { Controller, Post, Body, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { LeadMatchingService } from './lead-matching.service';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsIn } from 'class-validator';

class CaptureSecondaryEmailDto {
  @IsString()
  @IsNotEmpty()
  visitor_id: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  secondary_email: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['calendly', 'stripe', 'youtube', 'manual', 'other'])
  source: string;

  @IsString()
  @IsOptional()
  details?: string;
}

@Controller('api/leads')
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(private readonly leadMatchingService: LeadMatchingService) {}

  @Post('capture-secondary-email')
  async captureSecondaryEmail(@Body() dto: CaptureSecondaryEmailDto) {
    this.logger.log(`Capturing secondary email for visitor ${dto.visitor_id} from ${dto.source}`);
    
    const result = await this.leadMatchingService.captureSecondaryEmail(
      dto.visitor_id,
      dto.secondary_email,
      dto.source,
    );
    
    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
    }
    
    return {
      success: true,
      message: result.message,
      lead_id: result.leadId,
    };
  }
}
