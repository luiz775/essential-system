import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getAuthToken,
  loginOperador,
  logoutOperador,
  obterSessao,
  setAuthToken,
  type Operador,
} from "../lib/api";

type AuthContextValue = {
  operador: Operador | null;
  ready: boolean;
  login: (usuario: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operador, setOperador] = useState<Operador | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      setReady(true);
      return;
    }
    obterSessao()
      .then((data) => setOperador(data.operador))
      .catch(() => {
        setAuthToken(null);
        setOperador(null);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      operador,
      ready,
      async login(usuario: string, senha: string) {
        const data = await loginOperador(usuario, senha);
        setAuthToken(data.token);
        setOperador(data.operador);
      },
      async logout() {
        try {
          await logoutOperador();
        } catch {
          /* still leave locally */
        }
        setAuthToken(null);
        setOperador(null);
      },
    }),
    [operador, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa do AuthProvider");
  return ctx;
}
