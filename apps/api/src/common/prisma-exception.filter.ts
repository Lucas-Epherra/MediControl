import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Traduce errores conocidos de Prisma que no se manejaron en los servicios. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, 'El registro ya existe'],
      P2025: [HttpStatus.NOT_FOUND, 'Registro no encontrado'],
      P2003: [HttpStatus.BAD_REQUEST, 'Referencia inválida'],
    };
    const [statusCode, message] = map[exception.code] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Error interno',
    ];
    response.status(statusCode).json({ statusCode, message });
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
