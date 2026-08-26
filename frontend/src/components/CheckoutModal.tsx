import { useEffect, useMemo, useState } from "react";
import { formatMoney, listarClientes, money, type Cliente, type Pagamento } from "../lib/api";
import { NumberInput } from "./NumberInput";
import { buildPixPayload, normalizePixKey, pixQrUrl } from "../lib/pix";
import { Select } from "./Select";

type Metodo = Pagamento["metodo"];

export type PayDraft = {
  metodo: Metodo;
  valor: string;
  recebido: string;
  parcelas: number;
};

type Props = {
  total: number;
  pixChave: string;
  pixNome: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (
    pagamentos: PayDraft[],
    origem: "PDV" | "ONLINE",
    clienteId: string | null
  ) => void;
};

const metodos: { id: Metodo; label: string }[] = [
  { id: "DINHEIRO", label: "Dinheiro" },
  { id: "PIX", label: "PIX" },
  { id: "DEBITO", label: "Débito" },
  { id: "CREDITO", label: "Crédito" },
  { id: "FIADO", label: "A receber" },
];

export function CheckoutModal({
  total,
  pixChave,
  pixNome,
  busy,
  error,
  onClose,
  onConfirm,
}: Props) {
  const [pagamentos, setPagamentos] = useState<PayDraft[]>([
    { metodo: "DINHEIRO", valor: String(total), recebido: String(total), parcelas: 1 },
  ]);
  const [origem, setOrigem] = useState<"PDV" | "ONLINE">("PDV");
  const [clienteId, setClienteId] = useState("nenhum");
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    listarClientes()
      .then(setClientes)
      .catch(() => setClientes([]));
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const soma = money(pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0));
  const falta = money(total - soma);

  function patch(index: number, partial: Partial<PayDraft>) {
    setPagamentos((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...partial } : row))
    );
  }

  function addRow() {
    const resto = Math.max(0, falta);
    setPagamentos((prev) => [
      ...prev,
      { metodo: "PIX", valor: String(resto || ""), recebido: "", parcelas: 1 },
    ]);
  }

  const pixAtivo = pagamentos.some((p) => p.metodo === "PIX");
  const temFiado = pagamentos.some((p) => p.metodo === "FIADO");
  const clienteOk = !temFiado || clienteId !== "nenhum";

  const troco = useMemo(() => {
    return pagamentos
      .filter((p) => p.metodo === "DINHEIRO")
      .reduce((s, p) => s + Math.max(0, Number(p.recebido || 0) - Number(p.valor || 0)), 0);
  }, [pagamentos]);

  const clienteOptions = [
    { value: "nenhum", label: "Consumidor final" },
    ...clientes.map((c) => ({
      value: c.id,
      label: c.documento ? `${c.nome} · ${c.documento}` : c.nome,
    })),
  ];

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-start sm:overflow-y-auto sm:px-4 sm:pt-10 sm:pb-8 md:pt-14">
      <div className="modal-panel flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-panel sm:mt-0 sm:max-h-[calc(100vh-5.5rem)] sm:rounded-3xl">
        <div className="shrink-0 overflow-y-auto p-5 pb-3 sm:p-6">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Checkout</p>
              <h2 className="font-serif text-3xl sm:text-4xl">Finalizar venda</h2>
            </div>
            <p className="shrink-0 font-serif text-2xl text-gold sm:text-3xl">
              {formatMoney(total)}
            </p>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm text-sand/70">Cliente</p>
            <Select
              aria-label="Cliente da venda"
              value={clienteId}
              onChange={setClienteId}
              className="w-full rounded-xl border border-gold/25 bg-panel px-3 py-3 text-base sm:py-2.5 sm:text-sm"
              options={clienteOptions}
            />
            {clientes.length === 0 && (
              <p className="mt-2 text-xs text-sand/50">
                Cadastre clientes na aba Clientes para vincular o faturamento.
              </p>
            )}
            {temFiado && clienteId === "nenhum" && (
              <p className="mt-2 text-sm text-red-300">
                Fiado exige um cliente cadastrado.
              </p>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm text-sand/70">Origem da venda</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrigem("PDV")}
                className={`min-h-11 flex-1 rounded-full px-4 py-2 text-sm touch-manipulation ${
                  origem === "PDV" ? "bg-gold text-ink" : "border border-white/15"
                }`}
              >
                Física
              </button>
              <button
                type="button"
                onClick={() => setOrigem("ONLINE")}
                className={`min-h-11 flex-1 rounded-full px-4 py-2 text-sm touch-manipulation ${
                  origem === "ONLINE" ? "bg-gold text-ink" : "border border-white/15"
                }`}
              >
                Online
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {pagamentos.map((pag, index) => (
              <div key={index} className="rounded-2xl border border-white/10 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {metodos.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => patch(index, { metodo: m.id })}
                      className={`min-h-10 rounded-full px-3 py-2 text-sm touch-manipulation ${
                        pag.metodo === m.id ? "bg-gold text-ink" : "bg-white/5"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                  {pagamentos.length > 1 && (
                    <button
                      type="button"
                      className="ml-auto min-h-10 text-sm text-red-300 touch-manipulation"
                      onClick={() =>
                        setPagamentos((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Remover
                    </button>
                  )}
                </div>
                <label className="text-sm text-sand/70">
                  Valor
                  <NumberInput
                    min={0.01}
                    step="0.01"
                    inputMode="decimal"
                    value={pag.valor}
                    onChange={(e) => patch(index, { valor: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-base"
                  />
                </label>
                {pag.metodo === "FIADO" && (
                  <p className="mt-3 text-xs text-sand/60">
                    Entra em Contas a receber. Vencimento em 30 dias.
                  </p>
                )}
                {pag.metodo === "DINHEIRO" && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-sm text-sand/70">
                      Recebido
                      <NumberInput
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={pag.recebido}
                        onChange={(e) => patch(index, { recebido: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-base"
                      />
                    </label>
                    <div className="text-sm text-sand/70">
                      Troco
                      <p className="mt-2 font-serif text-2xl text-gold">
                        {formatMoney(
                          Math.max(0, Number(pag.recebido || 0) - Number(pag.valor || 0))
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {pag.metodo === "CREDITO" && (
                  <label className="mt-3 block text-sm text-sand/70">
                    Parcelas
                    <Select
                      aria-label="Parcelas"
                      value={String(pag.parcelas)}
                      onChange={(value) => patch(index, { parcelas: Number(value) })}
                      className="mt-1 w-full rounded-xl border border-gold/25 bg-panel px-3 py-3 text-base sm:py-2 sm:text-sm"
                      options={Array.from({ length: 12 }, (_, i) => i + 1).map((n) => ({
                        value: String(n),
                        label: `${n}x de ${formatMoney(Number(pag.valor || 0) / n)}`,
                      }))}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          {pixAtivo && (
            <PixCheckout
              chave={pixChave}
              nome={pixNome}
              valor={pagamentos
                .filter((pag) => pag.metodo === "PIX")
                .reduce((s, pag) => s + Number(pag.valor || 0), 0)}
            />
          )}

          <p className="mt-4 text-sm text-sand/70">
            Soma {formatMoney(soma)}
            {falta > 0.009 ? ` · falta ${formatMoney(falta)}` : ""}
            {troco > 0 ? ` · troco ${formatMoney(troco)}` : ""}
          </p>

          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-white/10 bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={addRow}
              className="min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm touch-manipulation"
            >
              + Outro pagamento
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm touch-manipulation"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={busy || Math.abs(falta) > 0.02 || !clienteOk}
              onClick={() =>
                onConfirm(pagamentos, origem, clienteId === "nenhum" ? null : clienteId)
              }
              className="btn-gold min-h-12 w-full rounded-full bg-gold px-5 py-3 text-sm font-medium text-ink touch-manipulation disabled:opacity-40 sm:ml-auto sm:w-auto"
            >
              {busy ? "Confirmando…" : "Confirmar venda"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PixCheckout({ chave, nome, valor }: { chave: string; nome: string; valor: number }) {
  const payload = buildPixPayload(chave, { nome, valor });
  const chavePix = normalizePixKey(chave);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-gold/30 bg-gold/5 p-4 sm:flex-row sm:items-center">
      <img src={pixQrUrl(chave, { nome, valor })} alt="QR PIX" className="h-36 w-36 rounded-lg bg-white p-1 sm:h-28 sm:w-28" />
      <div className="text-center sm:text-left">
        <p className="text-sm text-sand/70">PIX</p>
        <p className="font-medium">{nome}</p>
        <p className="break-all font-mono text-gold">{chavePix}</p>
        <button
          type="button"
          onClick={() => void copiar()}
          className="mt-2 text-sm text-gold underline"
        >
          Copiar código PIX
        </button>
      </div>
    </div>
  );
}
