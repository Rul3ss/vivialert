import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { PriceWatchService } from './price-watch.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { ApiKeyGuard } from '../common/api-key.guard';

/**
 * Tudo aqui exige a chave de API. O sistema tem **um alerta só**: o
 * `GET /alerts` devolve o alerta único (ou `null`) e `POST` recusa um segundo.
 */
@Controller('alerts')
@UseGuards(ApiKeyGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async findOne() {
    // Envelopado de propósito: devolver `null` fazia o Nest responder 200 com
    // corpo vazio (sem Content-Type), e o cliente estourava ao ler o JSON.
    return { alert: await this.alertsService.buscarUnico() };
  }

  @Post()
  create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAlertDto) {
    return this.alertsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.remove(id);
  }

  @Post(':id/check')
  check(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.checkPrice(id);
  }

  @Get(':id/prices')
  prices(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findPrices(id);
  }
}

/**
 * Rotas do vigia em um controller próprio (`/watch/...`) para nenhuma delas
 * disputar espaço com `:id` em `/alerts` — o `ParseUUIDPipe` responderia 400
 * para qualquer caminho que não fosse um UUID.
 */
@Controller('watch')
@UseGuards(ApiKeyGuard)
export class WatchController {
  constructor(private readonly watch: PriceWatchService) {}

  /** Estado do vigia, para a tela mostrar quando é a próxima checagem. */
  @Get('status')
  status() {
    return this.watch.status();
  }

  /** Força um ciclo agora (útil para conferir a notificação de verdade). */
  @Post('run')
  @HttpCode(200)
  async run() {
    const checados = await this.watch.rodarCiclo();
    return { checados, rodando: checados === null };
  }
}
