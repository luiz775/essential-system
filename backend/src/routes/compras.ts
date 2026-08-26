import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asNumber, money, toDecimal } from "../lib/money.js";

export const comprasRouter = Router();

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function parseRange(req: { query: Record<string, unknown> }) {
  const now = new Date();
  const from = req.query.from
    ? new Date(String(req.query.from))
    : startOfMonth(now);
  const to = req.query.to ? new Date(String(req.query.to)) : endOfMonth(now);
  return { from, to };
}

function mapCompra(
  compra: Awaited<ReturnType<typeof prisma.compra.findMany>>[number] & {
    produto: { id: string; nome: string; marca: string; precoVenda: Prisma.Decimal };
    fornecedor: { id: string; nome: string } | null;
  }
) {
  const valorUnitario = asNumber(compra.valorUnitario);
  const precoVendaRef = asNumber(compra.precoVendaRef);
  const totalCompra = money(valorUnitario * compra.quantidade);
  const vendaEstimada = money(precoVendaRef * compra.quantidade);
  return {
    id: compra.id,
    createdAt: compra.createdAt,
    quantidade: compra.quantidade,
    unidade: compra.unidade,
    valorUnitario,
    precoVendaRef,
    totalCompra,
    vendaEstimada,
    lucroEstimado: money(vendaEstimada - totalCompra),
    observacao: compra.observacao,
    produto: {
      id: compra.produto.id,
      nome: compra.produto.nome,
      marca: compra.produto.marca,
    },
    fornecedor: compra.fornecedor
      ? { id: compra.fornecedor.id, nome: compra.fornecedor.nome }
      : null,
  };
}

comprasRouter.get("/fornecedores", async (_req, res) => {
  const fornecedores = await prisma.fornecedor.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  res.json(fornecedores);
});

comprasRouter.post("/fornecedores", async (req, res) => {
  const nome = String(req.body.nome ?? "").trim();
  if (!nome) {
    res.status(400).json({ error: "Nome do fornecedor é obrigatório." });
    return;
  }
  const existente = await prisma.fornecedor.findUnique({ where: { nome } });
  if (existente) {
    res.json(existente);
    return;
  }
  const fornecedor = await prisma.fornecedor.create({
    data: {
      nome,
      telefone: req.body.telefone ? String(req.body.telefone) : null,
      email: req.body.email ? String(req.body.email) : null,
    },
  });
  res.status(201).json(fornecedor);
});

comprasRouter.get("/", async (req, res) => {
  const { from, to } = parseRange(req);
  const produtoId = req.query.produtoId ? String(req.query.produtoId) : undefined;
  const fornecedorId = req.query.fornecedorId
    ? String(req.query.fornecedorId)
    : undefined;

  const compras = await prisma.compra.findMany({
    where: {
      createdAt: { gte: from, lt: to },
      ...(produtoId ? { produtoId } : {}),
      ...(fornecedorId ? { fornecedorId } : {}),
    },
    include: {
      produto: { select: { id: true, nome: true, marca: true, precoVenda: true } },
      fornecedor: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = compras.map(mapCompra);
  const totalComprado = money(rows.reduce((s, r) => s + r.totalCompra, 0));
  const vendaEstimada = money(rows.reduce((s, r) => s + r.vendaEstimada, 0));
  const lucroEstimado = money(vendaEstimada - totalComprado);
  const ticketMedio = rows.length ? money(totalComprado / rows.length) : 0;

  const volumeMap = new Map<string, { nome: string; total: number; quantidade: number }>();
  for (const row of rows) {
    const atual = volumeMap.get(row.produto.id) ?? {
      nome: row.produto.nome,
      total: 0,
      quantidade: 0,
    };
    atual.total += row.totalCompra;
    atual.quantidade += row.quantidade;
    volumeMap.set(row.produto.id, atual);
  }
  const volumePorProduto = Array.from(volumeMap.entries())
    .map(([id, v]) => ({
      id,
      nome: v.nome,
      total: money(v.total),
      quantidade: v.quantidade,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  res.json({
    from,
    to,
    resumo: {
      totalComprado,
      vendaEstimada,
      lucroEstimado,
      ticketMedio,
      lancamentos: rows.length,
    },
    volumePorProduto,
    compras: rows,
  });
});

comprasRouter.post("/", async (req, res) => {
  const produtoId = String(req.body.produtoId ?? "");
  const quantidade = Number(req.body.quantidade);
  const valorUnitario = Number(req.body.valorUnitario);
  const unidade = String(req.body.unidade ?? "un").trim() || "un";
  const observacao = req.body.observacao ? String(req.body.observacao).trim() : null;
  let fornecedorId = req.body.fornecedorId ? String(req.body.fornecedorId) : null;
  const fornecedorNome = req.body.fornecedorNome
    ? String(req.body.fornecedorNome).trim()
    : "";

  if (!produtoId) {
    res.status(400).json({ error: "Selecione o produto." });
    return;
  }
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    res.status(400).json({ error: "Quantidade inválida." });
    return;
  }
  if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
    res.status(400).json({ error: "Valor unitário inválido." });
    return;
  }

  const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
  if (!produto) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }

  if (!fornecedorId && fornecedorNome) {
    const fornecedor = await prisma.fornecedor.upsert({
      where: { nome: fornecedorNome },
      update: {},
      create: { nome: fornecedorNome },
    });
    fornecedorId = fornecedor.id;
  }

  const estoqueAnterior = produto.estoque;
  const custoAnterior = asNumber(produto.precoCusto);
  const novoEstoque = estoqueAnterior + quantidade;
  const novoCusto =
    novoEstoque > 0
      ? money(
          (custoAnterior * estoqueAnterior + valorUnitario * quantidade) / novoEstoque
        )
      : valorUnitario;

  const compra = await prisma.$transaction(async (tx) => {
    const criada = await tx.compra.create({
      data: {
        produtoId,
        fornecedorId,
        quantidade,
        unidade,
        valorUnitario: toDecimal(valorUnitario),
        precoVendaRef: produto.precoVenda,
        observacao,
        ...(req.body.data ? { createdAt: new Date(String(req.body.data)) } : {}),
      },
      include: {
        produto: { select: { id: true, nome: true, marca: true, precoVenda: true } },
        fornecedor: { select: { id: true, nome: true } },
      },
    });

    await tx.produto.update({
      where: { id: produtoId },
      data: {
        estoque: { increment: quantidade },
        precoCusto: toDecimal(novoCusto),
      },
    });

    await tx.estoqueAjuste.create({
      data: {
        produtoId,
        tipo: "ENTRADA",
        quantidade,
        motivo: `Compra${fornecedorNome ? ` · ${fornecedorNome}` : ""}`,
      },
    });

    return criada;
  });

  res.status(201).json(mapCompra(compra));
});

comprasRouter.delete("/:id", async (req, res) => {
  const compra = await prisma.compra.findUnique({ where: { id: req.params.id } });
  if (!compra) {
    res.status(404).json({ error: "Compra não encontrada." });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.produto.update({
      where: { id: compra.produtoId },
      data: { estoque: { decrement: compra.quantidade } },
    });
    await tx.compra.delete({ where: { id: compra.id } });
  });

  res.status(204).end();
});
