import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import { ScanBarcode, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { CheckoutModal, type PayDraft } from "../components/CheckoutModal";
import { NumberInput } from "../components/NumberInput";
import { ProductCard, QtyControl } from "../components/ProductCard";
import { Select } from "../components/Select";
import { ProductPhoto } from "../components/ProductPhoto";
import { imprimirRecibo, ReciboTermico } from "../components/Recibo";
import {
  finalizarVenda,
  formatMoney,
  listarProdutos,
  money,
  obterCaixaAtual,
  obterLicenca,
  type LicencaStatus,
  type Produto,
  type Venda,
} from "../lib/api";

type CartItem = { produto: Produto; quantidade: number };

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function findByBarcode(produtos: Produto[], code: string) {
  const q = normalizeCode(code);
  if (!q) return undefined;
  const lower = q.toLowerCase();
  const stripped = q.replace(/^0+/, "") || "0";

  return (
    produtos.find((p) => p.codigoBarras && normalizeCode(p.codigoBarras) === q) ||
    produtos.find((p) => p.sku && p.sku.toLowerCase() === lower) ||
    produtos.find(
      (p) =>
        p.codigoBarras &&
        (normalizeCode(p.codigoBarras).replace(/^0+/, "") || "0") === stripped
    )
  );
}

function CartBody({
  cart,
  setCart,
  subtotal,
  descontoTipo,
  setDescontoTipo,
  descontoInput,
  setDescontoInput,
  descontoValor,
  total,
  caixaAberto,
  licenca,
  notice,
  onCheckout,
  finalizeLabel = "Finalizar (F2)",
}: {
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  subtotal: number;
  descontoTipo: "VALOR" | "PERCENTUAL";
  setDescontoTipo: (v: "VALOR" | "PERCENTUAL") => void;
  descontoInput: string;
  setDescontoInput: (v: string) => void;
  descontoValor: number;
  total: number;
  caixaAberto: boolean;
  licenca: LicencaStatus | null;
  notice: string | null;
  onCheckout: () => void;
  finalizeLabel?: string;
}) {
  return (
    <>
      {cart.length === 0 ? (
        <p className="py-8 text-center text-sm text-sand/60">
          Toque em um perfume para adicionar.
        </p>
      ) : (
        <ul className="space-y-3">
          {cart.map((item) => (
            <li
              key={item.produto.id}
              className="cart-row flex gap-3 rounded-2xl border border-white/10 p-2"
            >
              <ProductPhoto
                src={item.produto.fotoUrl}
                alt={item.produto.nome}
                className="h-14 w-14 shrink-0 rounded-xl"
                iconSize={18}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.produto.nome}</p>
                <p className="text-xs text-sand/60">{item.produto.marca}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <QtyControl
                    value={item.quantidade}
                    max={item.produto.estoque}
                    onChange={(quantidade) =>
                      setCart((prev) =>
                        prev.map((row) =>
                          row.produto.id === item.produto.id
                            ? { ...row, quantidade }
                            : row
                        )
                      )
                    }
                  />
                  <p className="shrink-0 text-sm text-gold">
                    {formatMoney(Number(item.produto.precoVenda) * item.quantidade)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="self-start p-2 text-sand/50 touch-manipulation hover:text-red-300"
                aria-label="Remover item"
                onClick={() =>
                  setCart((prev) =>
                    prev.filter((row) => row.produto.id !== item.produto.id)
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
        <div className="flex justify-between text-sand/70">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sand/70">Desconto</span>
          <Select
            aria-label="Tipo de desconto"
            value={descontoTipo}
            onChange={(value) => setDescontoTipo(value as "VALOR" | "PERCENTUAL")}
            className="rounded-xl border border-gold/25 bg-panel px-2.5 py-1.5 text-sm"
            options={[
              { value: "VALOR", label: "R$" },
              { value: "PERCENTUAL", label: "%" },
            ]}
          />
          <NumberInput
            min={0}
            step="0.01"
            value={descontoInput}
            onChange={(e) => setDescontoInput(e.target.value)}
            className="w-24 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-base"
          />
          <span className="ml-auto text-gold">-{formatMoney(descontoValor)}</span>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span>Total</span>
          <span className="font-serif text-3xl">{formatMoney(total)}</span>
        </div>
        <button
          type="button"
          disabled={cart.length === 0 || !caixaAberto || Boolean(licenca?.bloqueada)}
          onClick={onCheckout}
          className="btn-gold mt-2 w-full rounded-full bg-gold py-3.5 font-medium text-ink touch-manipulation disabled:opacity-40"
        >
          {finalizeLabel}
        </button>
      </div>
      {notice && <p className="mt-3 text-center text-sm text-sand/80">{notice}</p>}
    </>
  );
}

export function PdvPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [query, setQuery] = useState("");
  const [marca, setMarca] = useState("todas");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [descontoTipo, setDescontoTipo] = useState<"VALOR" | "PERCENTUAL">("VALOR");
  const [descontoInput, setDescontoInput] = useState("0");
  const [checkout, setCheckout] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [venda, setVenda] = useState<Venda | null>(null);
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [licenca, setLicenca] = useState<LicencaStatus | null>(null);

  async function load() {
    const [lista, caixa, lic] = await Promise.all([
      listarProdutos(),
      obterCaixaAtual(),
      obterLicenca(),
    ]);
    setProdutos(lista);
    setCaixaAberto(Boolean(caixa.caixa));
    setLicenca(lic);
  }

  useEffect(() => {
    load().catch((err) => setNotice(err.message));
  }, []);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch && !checkout && !venda && !cartOpen) {
      inputRef.current?.focus();
    }
  }, [checkout, venda, cart, cartOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        if (cart.length && caixaAberto && !licenca?.bloqueada) setCheckout(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart.length, caixaAberto, licenca?.bloqueada]);

  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [cartOpen]);

  const marcas = useMemo(
    () => Array.from(new Set(produtos.map((p) => p.marca))).sort(),
    [produtos]
  );

  const filtered = produtos.filter((p) => {
    const q = query.toLowerCase();
    const match =
      p.nome.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) ||
      p.familia.toLowerCase().includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q) ||
      (p.codigoBarras ?? "").includes(query);
    return p.ativo && match && (marca === "todas" || p.marca === marca);
  });

  function addProduct(produto: Produto): { ok: boolean; message: string } {
    if (!produto.ativo) {
      return { ok: false, message: "Produto inativo." };
    }
    if (produto.estoque <= 0) {
      setNotice("Produto sem estoque.");
      return { ok: false, message: `${produto.nome} sem estoque.` };
    }

    let message = `✓ ${produto.nome} adicionado`;
    let ok = true;

    setCart((prev) => {
      const found = prev.find((item) => item.produto.id === produto.id);
      if (found) {
        if (found.quantidade >= produto.estoque) {
          ok = false;
          message = `${produto.nome}: estoque máximo (${produto.estoque}).`;
          return prev;
        }
        message = `✓ ${produto.nome} · ${found.quantidade + 1} un.`;
        return prev.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });

    setNotice(ok ? null : message);
    return { ok, message };
  }

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const produto = findByBarcode(produtos, code);
      if (!produto) {
        setNotice(`Código não encontrado: ${code}`);
        return { ok: false, message: `Código não encontrado: ${code}` };
      }
      return addProduct(produto);
    },
    [produtos]
  );

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      if (cart.length) setCheckout(true);
      return;
    }
    const exact = findByBarcode(produtos, q);
    if (exact) {
      addProduct(exact);
      setQuery("");
      return;
    }
    if (filtered.length === 1) {
      addProduct(filtered[0]);
      setQuery("");
      return;
    }
    setNotice("Nenhum produto com esse código.");
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.produto.precoVenda) * item.quantidade,
    0
  );
  const descontoValor = money(
    descontoTipo === "PERCENTUAL"
      ? (subtotal * Number(descontoInput || 0)) / 100
      : Math.min(Number(descontoInput || 0), subtotal)
  );
  const total = money(Math.max(0, subtotal - descontoValor));
  const cartCount = cart.reduce((s, i) => s + i.quantidade, 0);

  const cartProps = {
    cart,
    setCart,
    subtotal,
    descontoTipo,
    setDescontoTipo,
    descontoInput,
    setDescontoInput,
    descontoValor,
    total,
    caixaAberto,
    licenca,
    notice,
  };

  async function confirm(
    pagamentos: PayDraft[],
    origem: "PDV" | "ONLINE",
    clienteId: string | null
  ) {
    setBusy(true);
    setError(null);
    try {
      const criada = await finalizarVenda({
        itens: cart.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
        })),
        descontoTipo,
        descontoInput: Number(descontoInput || 0),
        origem,
        clienteId,
        pagamentos: pagamentos.map((p) => ({
          metodo: p.metodo,
          valor: Number(p.valor),
          recebido: p.metodo === "DINHEIRO" ? Number(p.recebido || p.valor) : undefined,
          parcelas: p.metodo === "CREDITO" ? p.parcelas : undefined,
        })),
      });
      setCart([]);
      setDescontoInput("0");
      setCheckout(false);
      setCartOpen(false);
      setVenda(criada);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na venda.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_300px] lg:pb-0 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        {!caixaAberto && (
          <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm">
            Caixa fechado.{" "}
            <Link to="/caixa" className="text-gold underline">
              Abrir o caixa do dia
            </Link>{" "}
            para vender.
          </div>
        )}
        <div className="mb-4 sm:mb-6">
          <p className="hero-kicker text-xs uppercase tracking-[0.28em] text-gold">
            Vendas
          </p>
          <h1 className="hero-title font-serif text-3xl sm:text-5xl">
            Registrar venda
          </h1>
          <div className="relative mt-4 flex gap-2">
            <label className="relative block min-w-0 flex-1">
              <Search className="absolute top-3.5 left-4 text-sand/50" size={18} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                enterKeyHint="done"
                autoComplete="off"
                placeholder="Código de barras, SKU ou nome"
                className="search-glow w-full rounded-full border border-gold/40 bg-black/30 py-3.5 pr-4 pl-12 text-base outline-none focus:border-gold sm:py-3 sm:text-lg"
              />
            </label>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 text-gold touch-manipulation hover:bg-gold/20"
              aria-label="Abrir leitor de código de barras"
              title="Ler código de barras"
            >
              <ScanBarcode size={20} />
              <span className="hidden text-sm font-medium sm:inline">Ler código</span>
            </button>
          </div>
          <div className="mt-3 flex gap-3">
            <Select
              aria-label="Filtrar por casa"
              value={marca}
              onChange={setMarca}
              className="w-full rounded-full border border-gold/25 bg-panel px-4 py-2.5 text-sm shadow-[inset_0_0_0_1px_rgba(196,165,116,0.06)] sm:w-auto sm:min-w-[220px]"
              options={[
                { value: "todas", label: "Todas as casas" },
                ...marcas.map((m) => ({ value: m, label: m })),
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((produto) => (
            <ProductCard key={produto.id} produto={produto} onAdd={addProduct} />
          ))}
        </div>
      </section>

      <aside className="hidden h-fit rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] lg:sticky lg:top-24 lg:block">
        <div className="mb-4 flex items-center gap-2 text-gold">
          <ShoppingBag size={18} />
          <h2 className="font-serif text-2xl text-cream">Carrinho</h2>
        </div>
        <CartBody
          {...cartProps}
          onCheckout={() => setCheckout(true)}
        />
      </aside>

      {/* Barra fixa mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-page/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex min-h-12 flex-1 items-center gap-3 rounded-full border border-white/10 bg-panel px-4 touch-manipulation"
          >
            <ShoppingBag size={18} className="text-gold" />
            <span className="text-sm">
              {cartCount === 0
                ? "Carrinho vazio"
                : `${cartCount} ${cartCount === 1 ? "item" : "itens"}`}
            </span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 left-8 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-semibold text-ink">
                {cartCount}
              </span>
            )}
            <span className="ml-auto font-serif text-lg text-gold">
              {formatMoney(total)}
            </span>
          </button>
          <button
            type="button"
            disabled={
              cart.length === 0 || !caixaAberto || Boolean(licenca?.bloqueada)
            }
            onClick={() => setCheckout(true)}
            className="btn-gold min-h-12 shrink-0 rounded-full bg-gold px-5 text-sm font-medium text-ink touch-manipulation disabled:opacity-40"
          >
            Pagar
          </button>
        </div>
      </div>

      {/* Sheet do carrinho mobile */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Fechar carrinho"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-white/10 bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="mx-auto h-1 w-10 rounded-full bg-white/20 lg:hidden" />
            </div>
            <div className="mb-4 flex items-center justify-between gap-2 text-gold">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} />
                <h2 className="font-serif text-2xl text-cream">Carrinho</h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/15 p-2 text-sand/70 touch-manipulation"
                aria-label="Fechar"
                onClick={() => setCartOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <CartBody
              {...cartProps}
              finalizeLabel="Finalizar venda"
              onCheckout={() => {
                setCartOpen(false);
                setCheckout(true);
              }}
            />
          </div>
        </div>
      )}

      {scannerOpen && (
        <BarcodeScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleBarcodeScan}
        />
      )}

      {checkout && (
        <CheckoutModal
          total={total}
          pixChave={licenca?.pixChave ?? ""}
          pixNome={licenca?.pixNome ?? ""}
          busy={busy}
          error={error}
          onClose={() => setCheckout(false)}
          onConfirm={confirm}
        />
      )}

      {venda && licenca && (
        <div className="modal-backdrop fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4 print:static print:bg-white">
          <div className="modal-panel max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-3xl sm:p-6 print:border-0 print:bg-white print:p-0">
            <div className="no-print mb-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={imprimirRecibo}
                className="min-h-11 rounded-full bg-gold px-4 py-2.5 text-sm text-ink touch-manipulation"
              >
                Imprimir / PDF
              </button>
              <button
                type="button"
                onClick={() => setVenda(null)}
                className="min-h-11 rounded-full border border-white/15 px-4 py-2.5 text-sm touch-manipulation"
              >
                Nova venda
              </button>
            </div>
            <ReciboTermico
              venda={venda}
              lojaNome={licenca.lojaNome}
              pixChave={licenca.pixChave}
            />
          </div>
        </div>
      )}
    </div>
  );
}
