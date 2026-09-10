import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authApi,
  type LoginInput,
  type RegisterInput,
} from "../../features/auth/api/auth.api";
import { tokenStorage } from "../../services/token-storage";
import type { AuthUser } from "../../types/api";
interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login(input: LoginInput): Promise<AuthUser>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
}
export const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setInitializing] = useState(true);
  const refreshUser = useCallback(async () => {
    if (!tokenStorage.getAccess()) {
      const refreshed = await authApi.refresh();
      tokenStorage.set(refreshed.accessToken);
    }
    setUser(await authApi.me());
  }, []);
  useEffect(() => {
    refreshUser()
      .catch(() => {
        tokenStorage.clear();
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, [refreshUser]);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isInitializing,
      async login(input) {
        const payload = await authApi.login(input);
        tokenStorage.set(payload.accessToken);
        setUser(payload.user);
        return payload.user;
      },
      async register(input) {
        await authApi.register(input);
      },
      async logout() {
        try {
          await authApi.logout();
        } catch {
          // Local logout must complete even if the server is unavailable.
        } finally {
          tokenStorage.clear();
          setUser(null);
          window.location.assign("/login");
        }
      },
      refreshUser,
    }),
    [user, isInitializing, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
