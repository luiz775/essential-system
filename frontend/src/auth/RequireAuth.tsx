import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function RequireAuth() {
  const { operador, ready } = useAuth();
  if (!ready) {
    return (
      <div className="grid min-h-[100dvh] place-items-center text-sand/70">
        Abrindo o caixa…
      </div>
    );
  }
  if (!operador) return <Navigate to="/login" replace />;
  return <Outlet />;
}
