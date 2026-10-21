import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Get()
  findAll() {
    return this.alertsService.findAll();
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