/** Solo acepta rutas internas como destino después de ingresar, para no redirigir a otro sitio. */
export function safeNextPath(value: string | null): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/grupos';
}
