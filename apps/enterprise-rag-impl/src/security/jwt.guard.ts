import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env';
import { withActor } from '../database/pool';
import { users } from '../database/schema';
import type { ActorRequest } from './actor';

const USER_SYNC_TTL_MS = 5 * 60 * 1000;
const USER_SYNC_MAX_ENTRIES = 5_000;
const syncedUserCache = new Map<string, number>();

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(new URL(env.OIDC_JWKS_URL));
  }
  return remoteJwks;
}

export function clearSyncedUserCache(): void {
  syncedUserCache.clear();
  remoteJwks = null;
}

function isUserRecentlySynced(cacheKey: string, now: number): boolean {
  const expiresAt = syncedUserCache.get(cacheKey);
  if (expiresAt === undefined) {
    return false;
  }
  if (expiresAt <= now) {
    syncedUserCache.delete(cacheKey);
    return false;
  }
  return true;
}

function markUserSynced(cacheKey: string, now: number): void {
  if (syncedUserCache.size >= USER_SYNC_MAX_ENTRIES) {
    const oldestKey = syncedUserCache.keys().next().value;
    if (oldestKey !== undefined) {
      syncedUserCache.delete(oldestKey);
    }
  }
  syncedUserCache.set(cacheKey, now + USER_SYNC_TTL_MS);
}

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<ActorRequest & { headers: Record<string, string | undefined> }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    let sub: string;
    let email: string | null;
    try {
      const { payload } = await jwtVerify(authorization.slice(7), getJwks(), {
        issuer: env.OIDC_ISSUER,
        audience: env.OIDC_AUDIENCE,
        algorithms: ['RS256'],
      });
      if (payload.azp !== env.OIDC_CLIENT_ID || typeof payload.sub !== 'string' || !payload.sub.trim()) {
        throw new Error('Invalid OIDC client');
      }
      sub = payload.sub;
      const verified = payload.email_verified !== false;
      email =
        verified && typeof payload.email === 'string' && payload.email.trim() ? payload.email.trim() : null;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const now = Date.now();
    const cacheKey = `${sub}:${email ?? ''}`;
    if (!isUserRecentlySynced(cacheKey, now)) {
      // Provision the user before business endpoints; bounded TTL cache avoids a DB write on every GET.
      await withActor(sub, async (db) => {
        await db
          .insert(users)
          .values({ sub, email })
          .onConflictDoUpdate({
            target: users.sub,
            set: {
              email: sql`COALESCE(EXCLUDED.email, ${users.email})`,
            },
          });
      });
      markUserSynced(cacheKey, now);
    }

    request.actor = { sub, email };
    return true;
  }
}
