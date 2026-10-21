import {
  IsDateString,
  IsNumber,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @Length(3, 3)
  origin: string;

  @IsString()
  @Length(3, 3)
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