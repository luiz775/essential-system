import { formatMoney, METODO_LABEL, type LicencaStatus, type Venda } from "../lib/api";
import { pixQrUrl } from "../lib/pix";

export { pixQrUrl, buildPixPayload, normalizePixKey } from "../lib/pix";

type Props = {
  venda: Venda;
  lojaNome: string;
  pixChave?: string;
};

export function ReciboTermico({ venda, lojaNome, pixChave }: Props) {
  const data = new Date(venda.createdAt).toLocaleString("pt-BR");

  return (
    <div id="recibo-termico" className="recibo-termico">
      <h1>{lojaNome}</h1>
      <p>Comprovante não fiscal</p>
      <p>{data}</p>
      <p>Cupom {venda.id.slice(0, 8).toUpperCase()}</p>
      {venda.origem === "ONLINE" ? <p>Venda online</p> : <p>Venda presencial</p>}
      {venda.clienteNome ? <p>Cliente: {venda.clienteNome}</p> : null}
      <hr />
      {venda.itens.map((item) => (
        <div key={item.id} className="linha">
          <span>
            {item.quantidade}x {item.produto.nome}
            <br />
            <small>
              {item.produto.marca} {item.produto.volumeMl}ml
            </small>
          </span>
          <span>{formatMoney(Number(item.precoUnitario) * item.quantidade)}</span>
        </div>
      ))}
      <hr />
      <div className="linha">
        <span>Subtotal</span>
        <span>{formatMoney(venda.subtotal)}</span>
      </div>
      {Number(venda.descontoValor) > 0 && (
        <div className="linha">
          <span>Desconto</span>
          <span>-{formatMoney(venda.descontoValor)}</span>
        </div>
      )}
      {Number(venda.frete ?? 0) > 0 && (
        <div className="linha">
          <span>Frete</span>
          <span>{formatMoney(venda.frete ?? 0)}</span>
        </div>
      )}
      <div className="linha total">
        <span>Total</span>
        <span>{formatMoney(venda.total)}</span>
      </div>
      <hr />
      {venda.pagamentos.map((pag) => (
        <div key={pag.id} className="linha">
          <span>
            {METODO_LABEL[pag.metodo]}
            {pag.parcelas && pag.parcelas > 1 ? ` ${pag.parcelas}x` : ""}
          </span>
          <span>{formatMoney(pag.valor)}</span>
        </div>
      ))}
      {venda.pagamentos
        .filter((pag) => pag.metodo === "DINHEIRO" && pag.troco)
        .map((pag) => (
          <div key={`${pag.id}-troco`} className="linha">
            <span>Troco</span>
            <span>{formatMoney(pag.troco ?? 0)}</span>
          </div>
        ))}
      {pixChave && venda.pagamentos.some((pag) => pag.metodo === "PIX") && (
        <p className="pix">PIX: {pixChave}</p>
      )}
      <p className="fim">Obrigado pela preferência</p>
    </div>
  );
}

export function imprimirRecibo() {
  window.print();
}

export function LicenseBanner({ licenca }: { licenca: LicencaStatus }) {
  if (licenca.bloqueada) {
    return (
      <div className="print:hidden border-b border-red-400/40 bg-red-950/80 px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
          <div className="flex-1">
            <p className="font-medium text-red-100">Mensalidade vencida — sistema bloqueado</p>
            <p className="text-sm text-red-100/80">
              PIX {licenca.mensalidadePixNome}:{" "}
              <span className="font-mono text-gold">{licenca.mensalidadePixChave}</span>
              {" · "}tolerância de {licenca.toleranciaDias} dias encerrada
            </p>
          </div>
          <img
            src={pixQrUrl(licenca.mensalidadePixChave, { nome: licenca.mensalidadePixNome })}
            alt="QR PIX mensalidade"
            className="h-16 w-16 rounded bg-white p-1"
          />
        </div>
      </div>
    );
  }

  if (licenca.emTolerancia) {
    return (
      <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Licença vencida — tolerância até {licenca.toleranciaDias} dias. PIX:{" "}
        <strong>{licenca.mensalidadePixChave}</strong>
      </div>
    );
  }

  return null;
}
