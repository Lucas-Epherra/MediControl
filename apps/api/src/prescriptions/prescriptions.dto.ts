import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ISO_DATE_REGEX } from '../common/dates';

export class CreatePrescriptionDto {
  /** Por ejemplo "Receta Enalapril x 60" u "Orden de laboratorio". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @IsOptional()
  @IsUUID()
  medicationId?: string | null;

  @IsOptional()
  @Matches(ISO_DATE_REGEX, { message: 'issuedAt debe tener formato YYYY-MM-DD' })
  issuedAt?: string | null;

  @Matches(ISO_DATE_REGEX, { message: 'expiresAt debe tener formato YYYY-MM-DD' })
  expiresAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdatePrescriptionDto extends PartialType(CreatePrescriptionDto) {}
