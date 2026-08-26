import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asNumber, money, toDecimal } from "../lib/money.js";
import { assertCaixaAberto } from "../services/caixa.js";
import { assertLicencaAtiva } from "../services/licenca.js";

export const contasReceberRouter = Router();

const METODOS = new Set(["DINHEIRO", "PIX", "DEBITO", "CREDITO"]);

const include = {
  cliente: true,
  venda: {
    select: {
      id: true,
      createdAt: true,
      total: true,
      origem: true,
    },
  },
  recebimentos: { orderBy: { createdAt: "desc" as const } },
};

function serialize(conta: {
  valor: unknown;
  pago: unknown;
  status: string;
  vencimento: Date | null;
}) {
  const valor = asNumber(conta.valor as never);
  const pago = asNumber(conta.pago as never);
  const saldo = money(Math.max(0, valor - pago));
  const vencida =
    Boolean(conta.vencimento) &&
    saldo > 0.009 &&
    conta.status !== "CANCELADA" &&
    conta.status !== "PAGA" &&
    new Date(conta.vencimento as Date).getTime() < Date.now();
  return { valor, pago, saldo, vencida };
}

contasReceberRouter.get("/", async (req, res) => {
  const filtro = String(req.query.status ?? "abertas").toLowerCase();
  const where =
    filtro === "pagas"
      ? { status: "PAGA" }
      : filtro === "todas"
        ? {}
        : { status: { in: ["ABERTA", "PARCIAL"] } };

  const contas = await prisma.contaReceber.findMany({
    where,
    include,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const rows = contas.map((c) => ({
    ...c,
    ...serialize(c),
  }));

  const abertas = await prisma.contaReceber.findMany({
    where: { status: { in: ["ABERTA", "PARCIAL"] } },
  });
  const aReceber = money(abertas.reduce((s, c) => s + asNumber(c.valor) - asNumber(c.pago), 0));
  const atrasadas = abertas.filter(
    (c) => c.vencimento && c.vencimento.getTime() < Date.now()
  ).length;

  const mesFrom = new Date();
  mesFrom.setDate(1);
  mesFrom.setHours(0, 0, 0, 0);
  const recebidosMes = await prisma.recebimento.aggregate({
    where: { createdAt: { gte: mesFrom } },
    _sum: { valor: true },
  });

  res.json({
    resumo: {
      aReceber,
      quantidadeAbertas: abertas.length,
      atrasadas,
      recebidosMes: money(asNumber(recebidosMes._sum.valor ?? 0)),
    },
    contas: rows,
  });
});

contasReceberRouter.post("/:id/receber", async (req, res) => {
  try {
    await assertLicencaAtiva();
    const caixa = await assertCaixaAberto();
    const metodo = String(req.body?.metodo ?? "DINHEIRO").toUpperCase();
    const valor = money(Number(req.body?.valor));
    const observacao = req.body?.observacao ? String(req.body.observacao) : null;

    if (!METODOS.has(metodo)) throw new Error("Forma de recebimento inválida.");
    if (valor <= 0) throw new Error("Informe o valor recebido.");

    const atualizada = await prisma.$transaction(async (tx) => {
      const conta = await tx.contaReceber.findUnique({ where: { id: req.params.id } });
      if (!conta) throw new Error("Conta não encontrada.");
      if (conta.status === "CANCELADA") throw new Error("Conta cancelada.");
      if (conta.status === "PAGA") throw new Error("Conta já está quitada.");

      const saldo = money(asNumber(conta.valor) - asNumber(conta.pago));
      if (valor - saldo > 0.02) {
        throw new Error(`Valor maior que o saldo (${saldo.toFixed(2)}).`);
      }

      const pago = money(asNumber(conta.pago) + valor);
      const status = saldo - valor <= 0.02 ? "PAGA" : "PARCIAL";

      await tx.recebimento.create({
        data: {
          contaId: conta.id,
          valor: toDecimal(valor),
          metodo,
          observacao,
        },
      });

      if (metodo === "DINHEIRO") {
        const cliente = await tx.cliente.findUnique({ where: { id: conta.clienteId } });
        await tx.movimentoCaixa.create({
          data: {
            caixaId: caixa.id,
            tipo: "SUPRIMENTO",
            valor: toDecimal(valor),
            motivo: `Recebimento fiado · ${cliente?.nome ?? "cliente"}`,
          },
        });
      }

      return tx.contaReceber.update({
        where: { id: conta.id },
        data: { pago: toDecimal(pago), status },
        include,
      });
    });

    res.json({ ...atualizada, ...serialize(atualizada) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível registrar o recebimento.";
    const status = message === "LICENCA_VENCIDA" ? 402 : 400;
    res.status(status).json({
      error:
        message === "LICENCA_VENCIDA"
          ? "Mensalidade vencida. Regularize para voltar a operar."
          : message,
    });
  }
});
