import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { Atmosphere } from "../components/Atmosphere";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { operador, ready, login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (ready && operador) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(usuario, senha);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <Atmosphere />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-gold/25 bg-panel/90 p-6 shadow-2xl sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <BrandMark size={88} />
          <p className="mt-4 text-xs uppercase tracking-[0.28em] text-gold">Essential System</p>
          <h1 className="font-serif text-4xl text-cream">Entrar</h1>
          <p className="mt-1 text-sm text-sand/60">Operador da loja</p>
        </div>

        <label className="mt-8 block text-sm text-sand/70">
          Usuário
          <input
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gold/25 bg-black/20 px-3 py-3 text-base text-cream outline-none focus:border-gold"
          />
        </label>
        <label className="mt-4 block text-sm text-sand/70">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gold/25 bg-black/20 px-3 py-3 text-base text-cream outline-none focus:border-gold"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="btn-gold mt-6 min-h-12 w-full rounded-full bg-gold px-5 py-3 text-sm font-medium text-ink disabled:opacity-40"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
