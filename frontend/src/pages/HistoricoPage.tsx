import { useEffect, useState } from "react";
import {
  cancelarVenda,
  formatMoney,
  listarVendas,
  METODO_LABEL,
  obterLicenca,
  type LicencaStatus,
  type Venda,
} from "../lib/api";
import { imprimirRecibo, ReciboTermico } from "../components/Recibo";

export function HistoricoPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [selecionada, setSelecionada] = useState<Venda | null>(null);
  const [licenca, setLicenca] = useState<LicencaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [lista, lic] = await Promise.all([listarVendas(), obterLicenca()]);
    setVendas(lista);
    setLicenca(lic);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function cancelar(venda: Venda) {
    if (!confirm("Cancelar esta venda e devolver os itens ao estoque?")) return;
    try {
      await cancelarVenda(venda.id);
      await load();
      setSelecionada(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cancelar.");
    }
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Movimento</p>
      <h1 className="font-serif text-3xl sm:text-5xl">Histórico de vendas</h1>
      {error && <p className="mt-3 text-red-300">{error}</p>}

      {/* Cards no celular */}
      <div className="mt-6 space-y-3 md:hidden">
        {vendas.map((venda) => (
          <article
            key={venda.id}
            className="rounded-2xl border border-white/10 bg-panel/80 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-sand/70">
                  {new Date(venda.createdAt).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 font-medium text-cream">
                  {venda.clienteNome || "Consumidor final"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-sand/60">
                  {venda.itens
                    .map((i) => `${i.quantidade}x ${i.produto.nome}`)
                    .join(", ")}
                </p>
                <p className="mt-2 text-xs text-sand/50">
                  {venda.pagamentos.map((p) => METODO_LABEL[p.metodo]).join(" + ") || "—"}
                  {" · "}
                  {venda.origem === "ONLINE" ? "Online" : "Física"}
                  {venda.status === "CANCELADA" ? " · Cancelada" : ""}
                </p>
              </div>
              <p className="shrink-0 font-serif text-xl text-gold">
                {formatMoney(venda.total)}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="min-h-10 flex-1 rounded-full border border-white/15 px-3 text-sm touch-manipulation"
                onClick={() => setSelecionada(venda)}
              >
                Recibo
              </button>
              {venda.status !== "CANCELADA" && (
                <button
                  type="button"
                  className="min-h-10 flex-1 rounded-full border border-red-400/30 px-3 text-sm text-red-300 touch-manipulation"
                  onClick={() => cancelar(venda)}
                >
                  Cancelar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Tabela no desktop */}
      <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-white/10 bg-panel/80 md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-sand/60">
            <tr>
              <th className="px-5 py-4">Data</th>
              <th className="px-5 py-4">Cliente</th>
              <th className="px-5 py-4">Itens</th>
              <th className="px-5 py-4">Pagamento</th>
              <th className="px-5 py-4">Total</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {vendas.map((venda) => (
              <tr key={venda.id} className="border-t border-white/10">
                <td className="px-5 py-3">
                  {new Date(venda.createdAt).toLocaleString("pt-BR")}
                  <span className="ml-2 text-xs text-sand/50">
                    {venda.origem === "ONLINE" ? "Online" : "Física"}
                  </span>
                  {venda.status === "CANCELADA" && (
                    <span className="ml-2 text-xs text-red-300">Cancelada</span>
                  )}
                </td>
                <td className="px-5 py-3 text-sand/80">
                  {venda.clienteNome || "Consumidor final"}
                </td>
                <td className="px-5 py-3 text-sand/80">
                  {venda.itens
                    .map((i) => `${i.quantidade}x ${i.produto.nome}`)
                    .join(", ")}
                </td>
                <td className="px-5 py-3">
                  {venda.pagamentos
                    .map((p) => METODO_LABEL[p.metodo])
                    .join(" + ") || "—"}
                </td>
                <td className="px-5 py-3 text-gold">{formatMoney(venda.total)}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    className="text-sand/70 hover:text-gold"
                    onClick={() => setSelecionada(venda)}
                  >
                    Recibo
                  </button>
                  {venda.status !== "CANCELADA" && (
                    <button
                      type="button"
                      className="ml-3 text-red-300"
                      onClick={() => cancelar(venda)}
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selecionada && licenca && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-3xl sm:p-6">
            <div className="no-print mb-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={imprimirRecibo}
                className="min-h-11 rounded-full bg-gold px-4 py-2.5 text-sm text-ink touch-manipulation"
              >
                Reimprimir / PDF
              </button>
              <button
                type="button"
                onClick={() => setSelecionada(null)}
                className="min-h-11 rounded-full border border-white/15 px-4 py-2.5 text-sm touch-manipulation"
              >
                Fechar
              </button>
            </div>
            <ReciboTermico
              venda={selecionada}
              lojaNome={licenca.lojaNome}
              pixChave={licenca.pixChave}
            />
          </div>
        </div>
      )}
    </div>
  );
}
