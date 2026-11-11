import { config } from 'dotenv';
import { resolve } from 'node:path';

/** Los e2e usan el schema "e2e" de la misma base para no tocar los datos de desarrollo. */
export function e2eDatabaseUrl() {
  config({ path: resolve(__dirname, '../.env'), quiet: true });
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('schema', 'e2e');
  return url.toString();
}

process.env.DATABASE_URL = e2eDatabaseUrl();
process.env.JWT_SECRET ??= 'e2e-secret';
