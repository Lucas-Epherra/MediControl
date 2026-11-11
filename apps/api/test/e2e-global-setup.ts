import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { e2eDatabaseUrl } from './e2e-env';

/** Aplica migraciones al schema e2e. Cada corrida usa usuarios nuevos, así que no se borra nada. */
export default function globalSetup() {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: e2eDatabaseUrl() },
    stdio: 'ignore',
  });
}
