import { Controller, Get, Logger } from '@nestjs/common';
import { CalendlyV2Service } from './calendly-v2.service';

@Controller('calendly/v2')
export class CalendlyV2TestController {
  private readonly logger = new Logger(CalendlyV2TestController.name);

  constructor(private readonly calendlyV2Service: CalendlyV2Service) {}

  @Get('user')
  async getUser() {
    try {
      const user = await this.calendlyV2Service.getCurrentUser();
      return {
        success: true,
        message: 'Utilisateur récupéré avec succès',
        user
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la récupération de l'utilisateur: ${error.message}`);
      return {
        success: false,
        message: `Erreur: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
}
