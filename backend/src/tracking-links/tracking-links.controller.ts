import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Res, HttpStatus, NotFoundException } from '@nestjs/common';
import { TrackingLinksService } from './tracking-links.service';
import { CreateTrackingLinkDto } from './dto/create-tracking-link.dto';
import { UpdateTrackingLinkDto } from './dto/update-tracking-link.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';

@Controller()
export class TrackingLinksController {
  constructor(private readonly trackingLinksService: TrackingLinksService) {}

  @UseGuards(JwtAuthGuard)
  @Post('tracking-links')
  create(@Request() req, @Body() createTrackingLinkDto: CreateTrackingLinkDto) {
    return this.trackingLinksService.create(req.user.id, createTrackingLinkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tracking-links')
  findAll(@Request() req) {
    return this.trackingLinksService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tracking-links/:id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.trackingLinksService.findOne(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('tracking-links/:id')
  update(@Request() req, @Param('id') id: string, @Body() updateTrackingLinkDto: UpdateTrackingLinkDto) {
    return this.trackingLinksService.update(req.user.id, id, updateTrackingLinkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('tracking-links/:id')
  remove(@Request() req, @Param('id') id: string) {
    return this.trackingLinksService.remove(req.user.id, id);
  }

  @Public()
  @Get('t/:shortCode')
  async redirect(@Param('shortCode') shortCode: string, @Res() res: Response) {
    try {
      const trackingLink = await this.trackingLinksService.findByShortCode(shortCode);
      
      // Ici, on pourrait ajouter la logique pour enregistrer un clic (à implémenter ultérieurement)
      
      return res.redirect(trackingLink.destination_url);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({ 
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Lien de redirection non trouvé'
      });
    }
  }
}
