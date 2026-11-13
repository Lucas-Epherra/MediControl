import { PartialType } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ISO_DATE_REGEX, isValidTimezone } from '../common/dates';

@ValidatorConstraint({ name: 'timezone' })
class IsTimezone implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isValidTimezone(value);
  }

  defaultMessage() {
    return 'timezone debe ser una zona horaria IANA válida';
  }
}

const PHONE_REGEX = /^[\d\s+()-]{6,30}$/;

export class CreateGroupDto {
  /** Nombre del grupo, por ejemplo "Cuidado de Marta". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  patientName: string;

  @IsOptional()
  @Matches(ISO_DATE_REGEX, { message: 'patientBirthDate debe tener formato YYYY-MM-DD' })
  patientBirthDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  patientAllergies?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  patientConditions?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  doctorName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  doctorSpecialty?: string | null;

  /** Teléfono tal como se marca; se admiten dígitos, espacios, +, -, paréntesis. */
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'doctorPhone solo admite números, espacios, +, - y paréntesis' })
  doctorPhone?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'doctorEmail debe ser un email válido' })
  doctorEmail?: string | null;

  /** Zona horaria IANA. Por defecto America/Argentina/Buenos_Aires. */
  @IsOptional()
  @Validate(IsTimezone)
  timezone?: string;
}

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

export class UpdateMemberDto {
  @IsEnum(GroupRole)
  role: GroupRole;
}

export class CreateInvitationDto {
  /** Si se indica, solo una cuenta con este email puede aceptar. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email?: string;

  @IsEnum(GroupRole)
  role: GroupRole;
}
