import { Controller, Get, Header, Query } from '@nestjs/common';
import { AirportsService } from './airports.service';

@Controller('airports')
export class AirportsController {
  constructor(private readonly airportsService: AirportsService) {}

  /**
   * `GET /airports` devolve a lista inteira (o frontend cacheia e filtra).
   * `GET /airports?q=gru` é o atalho para busca no servidor.
   */
  @Get()
  @Header('Cache-Control', 'public, max-age=86400')
  search(@Query('q') q?: string) {
    return this.airportsService.search(q);
  }
}
