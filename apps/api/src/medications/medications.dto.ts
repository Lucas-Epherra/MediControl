import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ISO_DATE_REGEX, TIME_OF_DAY_REGEX } from '../common/dates';

export class CreateScheduleDto {
  /** Hora local del grupo, formato HH:mm. */
  @Matches(TIME_OF_DAY_REGEX, { message: 'timeOfDay debe tener formato HH:mm' })
  timeOfDay: string;

  /** 1 = lunes ... 7 = domingo. Vacío u omitido = todos los días. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitsPerDose?: number;

  /** YYYY-MM-DD. Por defecto, hoy en la zona del grupo. */
  @IsOptional()
  @Matches(ISO_DATE_REGEX, { message: 'startDate debe tener formato YYYY-MM-DD' })
  startDate?: string;

  /** YYYY-MM-DD, inclusive. `null` = sin fecha de fin. */
  @IsOptional()
  @Matches(ISO_DATE_REGEX, { message: 'endDate debe tener formato YYYY-MM-DD' })
  endDate?: string | null;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

export class CreateMedicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  /** Concentración, por ejemplo "10 mg". */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  strength?: string;

  /** Forma o unidad: comprimido, ml, gotas. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  form?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  schedules?: CreateScheduleDto[];
}

/** El stock se modifica con movimientos, no editando el medicamento. */
export class UpdateMedicationDto extends PartialType(
  OmitType(CreateMedicationDto, ['schedules', 'stock'] as const),
) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class StockMovementDto {
  /** RESTOCK suma `quantity`; ADJUSTMENT fija el stock en `quantity` (conteo real). */
  @IsIn(['RESTOCK', 'ADJUSTMENT'])
  type: 'RESTOCK' | 'ADJUSTMENT';

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class ListMedicationsQuery {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}
