import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@Request() req, @Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignsService.create(req.user.id, createCampaignDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.campaignsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.campaignsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
    return this.campaignsService.update(req.user.id, id, updateCampaignDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.campaignsService.remove(req.user.id, id);
  }
}
