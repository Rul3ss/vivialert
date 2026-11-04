import { IsBoolean, IsNumber, Min, ValidateIf } from 'class-validator';

/**
 * Atualização parcial: o cliente manda só o que quer mudar.
 * Mudar o alvo zera o estado de notificação (ver AlertsService.update).
 *
 * `ValidateIf` em vez de `IsOptional`: `IsOptional` também ignora `null`, que
 * então chegaria no service e estouraria (500). Assim `null` vira 400.
 */
export class UpdateAlertDto {
  @ValidateIf((_, valor) => valor !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  targetPrice?: number;

  @ValidateIf((_, valor) => valor !== undefined)
  @IsBoolean()
  active?: boolean;
}
