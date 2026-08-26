import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ScanBarcode } from "lucide-react";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { NumberInput } from "../components/NumberInput";
import { PhotoUpload } from "../components/PhotoUpload";
import {
  excluirProduto,
  obterProduto,
  salvarProduto,
  type Produto,
} from "../lib/api";

const empty = {
  nome: "",
  marca: "",
  familia: "",
  volumeMl: "100",
  sku: "",
  codigoBarras: "",
  descricao: "",
  precoCusto: "",
  precoVenda: "",
  estoque: "0",
  estoqueMin: "3",
  ativo: true,
};

export function ProdutoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    obterProduto(id).then((produto: Produto) => {
      setForm({
        nome: produto.nome,
        marca: produto.marca,
        familia: produto.familia,
        volumeMl: String(produto.volumeMl),
        sku: produto.sku ?? "",
        codigoBarras: produto.codigoBarras ?? "",
        descricao: produto.descricao ?? "",
        precoCusto: String(produto.precoCusto),
        precoVenda: String(produto.precoVenda),
        estoque: String(produto.estoque),
        estoqueMin: String(produto.estoqueMin),
        ativo: produto.ativo,
      });
      setCurrentUrl(produto.fotoUrl);
    });
  }, [id]);

  function setField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        payload.append(key, String(value));
      });
      if (file) payload.append("foto", file);
      if (removed && !file) payload.append("removerFoto", "true");
      await salvarProduto(payload, id);
      navigate("/estoque");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    if (!confirm("Excluir ou desativar este perfume?")) return;
    await excluirProduto(id);
    navigate("/estoque");
  }

  const fieldClass =
    "mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-cream outline-none focus:border-gold/60";

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs uppercase tracking-[0.28em] text-gold">Catálogo</p>
      <h1 className="mt-1 font-serif text-3xl sm:text-4xl">
        {id ? "Editar perfume" : "Novo perfume"}
      </h1>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-8 rounded-3xl border border-white/10 bg-panel/80 p-4 sm:p-6 md:grid-cols-[280px_1fr]"
      >
        <PhotoUpload
          currentUrl={currentUrl}
          file={file}
          removed={removed}
          onFileChange={(next) => {
            setFile(next);
            if (next) setRemoved(false);
          }}
          onRemoveCurrent={() => setRemoved(true)}
        />

        <div className="grid gap-4">
          <label className="text-sm text-sand/80">
            Nome
            <input
              required
              className={fieldClass}
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-sand/80">
              Marca / linha
              <input
                required
                className={fieldClass}
                value={form.marca}
                onChange={(e) => setField("marca", e.target.value)}
                placeholder="O Boticário, Natura, Importado…"
              />
            </label>
            <label className="text-sm text-sand/80">
              Família / linha olfativa
              <input
                required
                className={fieldClass}
                value={form.familia}
                onChange={(e) => setField("familia", e.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-sand/80">
              Volume (ml)
              <NumberInput
                required
                min={1}
                className={fieldClass}
                value={form.volumeMl}
                onChange={(e) => setField("volumeMl", e.target.value)}
              />
            </label>
            <label className="text-sm text-sand/80">
              Preço de custo
              <NumberInput
                required
                step="0.01"
                min={0}
                className={fieldClass}
                value={form.precoCusto}
                onChange={(e) => setField("precoCusto", e.target.value)}
              />
            </label>
            <label className="text-sm text-sand/80">
              Preço de venda
              <NumberInput
                required
                step="0.01"
                min={0}
                className={fieldClass}
                value={form.precoVenda}
                onChange={(e) => setField("precoVenda", e.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-sand/80">
              Estoque
              <NumberInput
                required
                min={0}
                className={fieldClass}
                value={form.estoque}
                onChange={(e) => setField("estoque", e.target.value)}
              />
            </label>
            <label className="text-sm text-sand/80">
              Estoque mínimo
              <NumberInput
                min={0}
                className={fieldClass}
                value={form.estoqueMin}
                onChange={(e) => setField("estoqueMin", e.target.value)}
              />
            </label>
            <label className="text-sm text-sand/80">
              SKU
              <input
                className={fieldClass}
                value={form.sku}
                onChange={(e) => setField("sku", e.target.value)}
              />
            </label>
            <div className="sm:col-span-3">
              <p className="text-sm text-sand/80">Código de barras</p>
              <div className="mt-1 flex gap-2">
                <input
                  className={`${fieldClass} mt-0 min-w-0 flex-1`}
                  value={form.codigoBarras}
                  onChange={(e) => setField("codigoBarras", e.target.value)}
                  placeholder="Digite ou leia com a câmera"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 text-gold touch-manipulation hover:bg-gold/20 sm:px-4"
                  aria-label="Ler código de barras"
                  title="Ler código de barras"
                >
                  <ScanBarcode size={20} />
                  <span className="hidden text-sm font-medium sm:inline">Ler</span>
                </button>
              </div>
            </div>
          </div>
          <label className="text-sm text-sand/80">
            Descrição
            <textarea
              rows={3}
              className={fieldClass}
              value={form.descricao}
              onChange={(e) => setField("descricao", e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-sand/80">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setField("ativo", e.target.checked)}
            />
            Ativo para venda
          </label>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-ink touch-manipulation disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar perfume"}
            </button>
            <Link
              to="/estoque"
              className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-6 py-2.5 text-sm text-sand"
            >
              Cancelar
            </Link>
            {id && (
              <button
                type="button"
                onClick={onDelete}
                className="ml-auto text-sm text-red-300"
              >
                Excluir
              </button>
            )}
          </div>
        </div>
      </form>

      {scannerOpen && (
        <BarcodeScannerModal
          open={scannerOpen}
          title="Ler código do produto"
          hint="Aponte para o código de barras. O valor será preenchido no campo automaticamente."
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            setField("codigoBarras", code.trim());
            setScannerOpen(false);
            return { ok: true, message: `✓ Código ${code}` };
          }}
        />
      )}
    </div>
  );
}
