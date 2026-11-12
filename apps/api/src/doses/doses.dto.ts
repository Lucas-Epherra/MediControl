import { DoseStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ISO_DATE_REGEX } from '../common/dates';

export class RecordDoseDto {
  @IsUUID()
  scheduleId: string;

  /** Instante programado tal como lo devuelve la vista del día (ISO 8601). */
  @IsISO8601({ strict: true })
  scheduledFor: string;

  @IsEnum(DoseStatus)
  status: DoseStatus;

  /** Motivo de omisión u observaciones. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class DayQuery {
  /** YYYY-MM-DD en la zona del grupo. Por defecto, hoy. */
  @IsOptional()
  @Matches(ISO_DATE_REGEX, { message: 'date debe tener formato YYYY-MM-DD' })
  date?: string;
}

export class HistoryQuery {
  /** YYYY-MM-DD inclusive. Por defecto, hace 7 días. */
  @IsOptional()
  @Matches(ISO_DATE_REGEX, { message: 'from debe tener formato YYYY-MM-DD' })
  from?: string;

  /** YYYY-MM-DD inclusive. Por defecto, hoy. */
  @IsOptional()
  @Matches(ISO_DATE_REGEX, { message: 'to debe tener formato YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsUUID()
  medicationId?: string;

  /** Solo las tomas que registró este usuario. */
  @IsOptional()
  @IsUUID()
  recordedById?: string;

  @IsOptional()
  @IsEnum(DoseStatus)
  status?: DoseStatus;
}
