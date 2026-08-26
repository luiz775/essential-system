import { Minus, Plus } from "lucide-react";
import { formatMoney, type Produto } from "../lib/api";
import { ProductPhoto } from "./ProductPhoto";

type Props = {
  produto: Produto;
  onAdd: (produto: Produto) => void;
};

export function ProductCard({ produto, onAdd }: Props) {
  const semEstoque = produto.estoque <= 0;

  return (
    <article className="card-live group relative z-0 flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-panel shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
      <div
        className="relative w-full shrink-0 overflow-hidden bg-panel-2 aspect-square sm:aspect-[3/4]"
      >
        <ProductPhoto
          src={produto.fotoUrl}
          alt={produto.nome}
          className="absolute inset-0 h-full w-full transition duration-700 ease-out group-hover:scale-105"
          iconSize={28}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2.5 pt-2.5 pb-2.5 sm:gap-2 sm:px-3 sm:pt-3 sm:pb-3">
        <div className="min-w-0">
          <p className="truncate text-[9px] uppercase tracking-[0.16em] text-gold sm:text-[10px] sm:tracking-[0.18em]">
            {produto.marca}
          </p>
          <h3 className="line-clamp-2 font-serif text-base leading-tight text-cream sm:text-lg">
            {produto.nome}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-sand/70 sm:mt-1 sm:text-xs">
            {produto.familia} · {produto.volumeMl} ml
          </p>
        </div>

        <div className="mt-auto space-y-1.5 pt-1 sm:space-y-2">
          <div>
            <p className="font-serif text-lg leading-none text-gold sm:text-xl">
              {formatMoney(produto.precoVenda)}
            </p>
            <p
              className={`mt-1 text-[11px] ${
                produto.estoque <= 0
                  ? "text-red-300"
                  : produto.estoque <= produto.estoqueMin
                    ? "text-amber-300"
                    : "text-sand/60"
              }`}
            >
              {semEstoque ? "Esgotado" : `${produto.estoque} un.`}
            </p>
          </div>
          <button
            type="button"
            disabled={semEstoque || !produto.ativo}
            onClick={() => onAdd(produto)}
            className="btn-gold add-btn inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gold px-3 text-xs font-medium text-ink touch-manipulation disabled:cursor-not-allowed disabled:opacity-40 sm:h-9"
          >
            <span className="add-icon">
              <Plus size={14} />
            </span>
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}

export function QtyControl({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/10">
      <button
        type="button"
        className="cursor-pointer p-3 text-sand/80 transition touch-manipulation hover:text-gold sm:p-2"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Diminuir"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-6 text-center text-sm">{value}</span>
      <button
        type="button"
        className="cursor-pointer p-3 text-sand/80 transition touch-manipulation hover:text-gold sm:p-2"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Aumentar"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
