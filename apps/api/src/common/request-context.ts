import type { Membership } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      membership?: Membership;
    }
  }
}
