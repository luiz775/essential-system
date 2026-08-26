import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asNumber, money, toDecimal } from "../lib/money.js";
import { assertCaixaAberto } from "../services/caixa.js";
import { assertLicencaAtiva } from "../services/licenca.js";

export const vendasRouter = Router();

const METODOS = new Set(["DINHEIRO", "PIX", "DEBITO", "CREDITO", "FIADO"]);

function vendaInclude() {
  return {
    itens: { include: { produto: true } },
    pagamentos: true,
    caixa: true,
    cliente: true,
  } as const;
}

vendasRouter.get("/", async (req, res) => {
  const origem = req.query.origem ? String(req.query.origem) : undefined;
  const vendas = await prisma.venda.findMany({
    where: origem ? { origem } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: vendaInclude(),
  });
  res.json(vendas);
});

vendasRouter.get("/:id", async (req, res) => {
  const venda = await prisma.venda.findUnique({
    where: { id: req.params.id },
    include: vendaInclude(),
  });
  if (!venda) {
    res.status(404).json({ error: "Venda não encontrada." });
    return;
  }
  res.json(venda);
});

vendasRouter.post("/", async (req, res) => {
  const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
  const pagamentos = Array.isArray(req.body?.pagamentos) ? req.body.pagamentos : [];
  if (itens.length === 0) {
    res.status(400).json({ error: "Carrinho vazio." });
    return;
  }

  try {
    await assertLicencaAtiva();
    const caixa = await assertCaixaAberto();

    const venda = await prisma.$transaction(async (tx) => {
      const linhas: {
        produtoId: string;
        quantidade: number;
        precoUnitario: Prisma.Decimal;
      }[] = [];

      let subtotal = 0;

      for (const item of itens) {
        const produtoId = String(item.produtoId);
        const quantidade = Number(item.quantidade);
        if (!produtoId || !Number.isInteger(quantidade) || quantidade <= 0) {
          throw new Error("Item inválido no carrinho.");
        }

        const produto = await tx.produto.findUnique({ where: { id: produtoId } });
        if (!produto || !produto.ativo) {
          throw new Error("Produto indisponível.");
        }
        if (produto.estoque < quantidade) {
          throw new Error(`Estoque insuficiente para ${produto.nome}.`);
        }

        await tx.produto.update({
          where: { id: produtoId },
          data: { estoque: { decrement: quantidade } },
        });

        linhas.push({
          produtoId,
          quantidade,
          precoUnitario: produto.precoVenda,
        });
        subtotal += asNumber(produto.precoVenda) * quantidade;
      }

      const descontoTipo =
        String(req.body?.descontoTipo ?? "VALOR").toUpperCase() === "PERCENTUAL"
          ? "PERCENTUAL"
          : "VALOR";
      const descontoInput = money(Number(req.body?.descontoInput ?? 0));
      const descontoValor = money(
        descontoTipo === "PERCENTUAL"
          ? (subtotal * descontoInput) / 100
          : Math.min(descontoInput, subtotal)
      );
      const total = money(Math.max(0, subtotal - descontoValor));

      if (pagamentos.length === 0) {
        throw new Error("Informe ao menos uma forma de pagamento.");
      }

      const pagamentosCriados: {
        metodo: string;
        valor: Prisma.Decimal;
        recebido: Prisma.Decimal | null;
        troco: Prisma.Decimal | null;
        parcelas: number | null;
      }[] = [];

      let somaPagamentos = 0;

      for (const pag of pagamentos) {
        const metodo = String(pag.metodo ?? "").toUpperCase();
        if (!METODOS.has(metodo)) throw new Error("Forma de pagamento inválida.");
        const valor = money(Number(pag.valor));
        if (valor <= 0) throw new Error("Valor de pagamento inválido.");
        somaPagamentos += valor;

        let recebido: number | null = null;
        let troco: number | null = null;
        let parcelas: number | null = null;

        if (metodo === "DINHEIRO") {
          recebido = money(Number(pag.recebido ?? valor));
          if (recebido < valor) throw new Error("Valor recebido em dinheiro é insuficiente.");
          troco = money(recebido - valor);
        }
        if (metodo === "CREDITO") {
          parcelas = Math.max(1, Math.min(12, Number(pag.parcelas ?? 1)));
        }
        if (metodo === "FIADO") {
          recebido = null;
          troco = null;
          parcelas = null;
        }

        pagamentosCriados.push({
          metodo,
          valor: toDecimal(valor),
          recebido: recebido === null ? null : toDecimal(recebido),
          troco: troco === null ? null : toDecimal(troco),
          parcelas,
        });
      }

      if (Math.abs(somaPagamentos - total) > 0.02) {
        throw new Error(
          `Pagamentos (${somaPagamentos.toFixed(2)}) não fecham o total (${total.toFixed(2)}).`
        );
      }

      const fiadoValor = money(
        pagamentosCriados
          .filter((p) => p.metodo === "FIADO")
          .reduce((sum, p) => sum + asNumber(p.valor), 0)
      );

      const clienteId = req.body?.clienteId ? String(req.body.clienteId) : null;
      let clienteNome: string | null = req.body?.clienteNome
        ? String(req.body.clienteNome)
        : null;
      let clienteWhatsapp: string | null = null;
      let clienteEmail: string | null = null;

      if (fiadoValor > 0 && !clienteId) {
        throw new Error("Selecione um cliente para vender a receber (fiado).");
      }

      if (clienteId) {
        const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
        if (!cliente || !cliente.ativo) {
          throw new Error("Cliente inválido ou inativo.");
        }
        clienteNome = cliente.nome;
        clienteWhatsapp = cliente.whatsapp;
        clienteEmail = cliente.email;
      }

      const venda = await tx.venda.create({
        data: {
          subtotal: toDecimal(subtotal),
          descontoTipo,
          descontoInput: toDecimal(descontoInput),
          descontoValor: toDecimal(descontoValor),
          total: toDecimal(total),
          status: "CONCLUIDA",
          origem: String(req.body?.origem ?? "PDV").toUpperCase() === "ONLINE"
            ? "ONLINE"
            : "PDV",
          frete: toDecimal(0),
          caixaId: caixa.id,
          clienteId,
          clienteNome,
          clienteWhatsapp,
          clienteEmail,
          itens: { create: linhas },
          pagamentos: { create: pagamentosCriados },
        },
        include: vendaInclude(),
      });

      if (fiadoValor > 0 && clienteId) {
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 30);
        await tx.contaReceber.create({
          data: {
            clienteId,
            vendaId: venda.id,
            descricao: `Venda ${venda.id.slice(0, 8).toUpperCase()}`,
            valor: toDecimal(fiadoValor),
            vencimento,
            status: "ABERTA",
          },
        });
      }

      return venda;
    });

    res.status(201).json(venda);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível finalizar a venda.";
    const status = message === "LICENCA_VENCIDA" ? 402 : 400;
    res.status(status).json({
      error:
        message === "LICENCA_VENCIDA"
          ? "Mensalidade vencida. Regularize para voltar a vender."
          : message,
    });
  }
});

vendasRouter.post("/:id/cancelar", async (req, res) => {
  try {
    await assertLicencaAtiva();
    const atual = await prisma.venda.findUnique({
      where: { id: req.params.id },
      include: { itens: true, contasReceber: true },
    });
    if (!atual) {
      res.status(404).json({ error: "Venda não encontrada." });
      return;
    }
    if (atual.status === "CANCELADA") {
      res.status(400).json({ error: "Venda já cancelada." });
      return;
    }

    if (atual.contasReceber.some((c) => asNumber(c.pago) > 0.009)) {
      res.status(400).json({
        error:
          "Esta venda já teve recebimento no fiado. Estorne ou quite a conta antes de cancelar.",
      });
      return;
    }

    const venda = await prisma.$transaction(async (tx) => {
      for (const item of atual.itens) {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoque: { increment: item.quantidade } },
        });
      }
      await tx.contaReceber.updateMany({
        where: { vendaId: atual.id, status: { not: "CANCELADA" } },
        data: { status: "CANCELADA" },
      });
      return tx.venda.update({
        where: { id: atual.id },
        data: { status: "CANCELADA", canceladaEm: new Date() },
        include: vendaInclude(),
      });
    });

    res.json(venda);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cancelar.";
    res.status(400).json({
      error:
        message === "LICENCA_VENCIDA"
          ? "Mensalidade vencida. Regularize para voltar a operar."
          : message,
    });
  }
});

vendasRouter.post("/:id/status", async (req, res) => {
  const status = String(req.body?.status ?? "").toUpperCase();
  const permitido = new Set(["PAGO", "ENVIADO"]);
  if (!permitido.has(status)) {
    res.status(400).json({ error: "Status inválido." });
    return;
  }

  const atual = await prisma.venda.findUnique({ where: { id: req.params.id } });
  if (!atual) {
    res.status(404).json({ error: "Pedido não encontrado." });
    return;
  }
  if (atual.origem !== "ONLINE") {
    res.status(400).json({ error: "Só pedidos online mudam de status por aqui." });
    return;
  }
  if (atual.status === "CANCELADA") {
    res.status(400).json({ error: "Pedido cancelado." });
    return;
  }

  const venda = await prisma.venda.update({
    where: { id: atual.id },
    data: { status },
    include: vendaInclude(),
  });
  res.json(venda);
});
