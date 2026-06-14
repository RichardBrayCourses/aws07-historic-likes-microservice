import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import type { AuthenticatedUser } from "@/types";
import {
  doLogout,
  getUserFromStoredToken,
  handleOAuthCallback,
  startLogin,
} from "@/services/cognito";

/////////////
// CONTEXT
/////////////

interface AuthContextData {
  user: AuthenticatedUser | null;
  isLoggedIn: boolean;
}
interface AuthContextValue extends AuthContextData {
  completeOAuthCallback: (code: string, state: string) => Promise<void>;
  login: () => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/////////////
// HELPER
/////////////

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within <AuthProvider>");
  return value;
}

/////////////
// PROVIDER
/////////////

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = !!user;

  useEffect(() => {
    setUser(getUserFromStoredToken());
    setLoading(false);
  }, []);

  const login = () => {
    startLogin();
  };

  const completeOAuthCallback = async (code: string, state: string) => {
    const user = await handleOAuthCallback(code, state);
    setUser(user);
  };

  const logout = () => {
    setUser(null);
    doLogout();
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn, completeOAuthCallback, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
