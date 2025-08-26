import type { Context as HonoContext } from 'hono';

export interface ContextVariableMap {
  userId: number;
  userEmail: string;
  jti: string;
  requestId: string;
}

export type Context = HonoContext<{ Variables: ContextVariableMap }>;