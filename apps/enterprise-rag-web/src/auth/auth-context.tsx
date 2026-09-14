import type { User } from 'oidc-client-ts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { userManager } from './oidc';
import { resetSessionQueryCache } from './query-client';

export type Session = {
  user: User | null;
  actorKey: string;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const previousSubRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const current = (await userManager.getUser()) ?? null;
      const validUser = current && !current.expired ? current : null;
      const nextSub = validUser?.profile.sub ?? null;
      if (previousSubRef.current !== null && previousSubRef.current !== nextSub) {
        resetSessionQueryCache();
      }
      previousSubRef.current = nextSub;
      setUser(validUser);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handleUserChanged = () => {
      void refresh();
    };
    const handleSessionCleared = () => {
      resetSessionQueryCache();
      void refresh();
    };

    userManager.events.addUserLoaded(handleUserChanged);
    userManager.events.addUserUnloaded(handleSessionCleared);
    userManager.events.addAccessTokenExpired(handleSessionCleared);
    return () => {
      userManager.events.removeUserLoaded(handleUserChanged);
      userManager.events.removeUserUnloaded(handleSessionCleared);
      userManager.events.removeAccessTokenExpired(handleSessionCleared);
    };
  }, [refresh]);

  const actorKey = user && !user.expired ? user.profile.sub : 'anonymous';

  return <AuthContext.Provider value={{ user, actorKey, loading, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): Session {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}

export function useActorKey(): string {
  const value = useContext(AuthContext);
  return value?.actorKey ?? 'anonymous';
}
