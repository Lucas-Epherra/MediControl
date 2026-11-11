import { PartialType } from '@nestjs/swagger';
import { GroupRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidTimezone } from '../common/dates';

@ValidatorConstraint({ name: 'timezone' })
class IsTimezone implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isValidTimezone(value);
  }

  defaultMessage() {
    return 'timezone debe ser una zona horaria IANA válida';
  }
}

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
  @IsString()
  @MaxLength(2000)
  notes?: string;

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
