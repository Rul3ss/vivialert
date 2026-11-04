import { IsDateString, IsNumber, IsString, Matches, Min } from 'class-validator';

/** Criar o alerta: trecho, ida, volta e o valor que se quer encontrar. */
export class CreateAlertDto {
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'Use o código IATA com 3 letras.' })
  origin: string;

  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'Use o código IATA com 3 letras.' })
  destination: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use o formato AAAA-MM-DD' })
  @IsDateString()
  departureDate: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use o formato AAAA-MM-DD' })
  @IsDateString()
  returnDate: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  targetPrice: number;
}
