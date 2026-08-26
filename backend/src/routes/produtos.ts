import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { handleFotoUpload } from "../middleware/handleUpload.js";
import { deleteProdutoFoto, uploadProdutoFoto } from "../services/storage.js";

export const produtosRouter = Router();

function parseProdutoBody(body: Record<string, unknown>) {
  const nome = String(body.nome ?? "").trim();
  const marca = String(body.marca ?? "").trim();
  const familia = String(body.familia ?? "").trim();
  const descricao = body.descricao ? String(body.descricao).trim() : null;
  const skuRaw = body.sku ? String(body.sku).trim() : "";
  const codigoBarras = body.codigoBarras ? String(body.codigoBarras).trim() : "";
  const volumeMl = Number(body.volumeMl);
  const precoCusto = Number(body.precoCusto);
  const precoVenda = Number(body.precoVenda);
  const estoque = Number(body.estoque);
  const estoqueMin = Number(body.estoqueMin ?? 3);
  const ativo =
    body.ativo === false || body.ativo === "false" || body.ativo === "0"
      ? false
      : true;

  if (!nome || !marca || !familia) {
    throw new Error("Nome, marca e família olfativa são obrigatórios.");
  }
  if (!Number.isFinite(volumeMl) || volumeMl <= 0) {
    throw new Error("Volume inválido.");
  }
  if (!Number.isFinite(precoCusto) || !Number.isFinite(precoVenda)) {
    throw new Error("Preços inválidos.");
  }
  if (!Number.isInteger(estoque) || estoque < 0) {
    throw new Error("Estoque inválido.");
  }

  return {
    nome,
    marca,
    familia,
    descricao,
    sku: skuRaw || null,
    codigoBarras: codigoBarras || null,
    volumeMl,
    precoCusto: new Prisma.Decimal(precoCusto),
    precoVenda: new Prisma.Decimal(precoVenda),
    estoque,
    estoqueMin: Number.isFinite(estoqueMin) ? estoqueMin : 3,
    ativo,
  };
}

produtosRouter.get("/", async (_req, res) => {
  const produtos = await prisma.produto.findMany({
    orderBy: [{ marca: "asc" }, { nome: "asc" }],
  });
  res.json(produtos);
});

produtosRouter.get("/busca", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.json([]);
    return;
  }
  const produtos = await prisma.produto.findMany({
    where: {
      OR: [
        { codigoBarras: q },
        { sku: q },
        { nome: { contains: q } },
        { marca: { contains: q } },
      ],
    },
    take: 20,
  });
  res.json(produtos);
});

produtosRouter.post("/:id/ajuste", async (req, res) => {
  try {
    const tipo = String(req.body?.tipo ?? "").toUpperCase();
    const quantidade = Number(req.body?.quantidade);
    const motivo = req.body?.motivo ? String(req.body.motivo) : null;
    if (tipo !== "ENTRADA" && tipo !== "PERDA") {
      throw new Error("Tipo de ajuste inválido.");
    }
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new Error("Quantidade inválida.");
    }

    const produto = await prisma.produto.findUnique({ where: { id: req.params.id } });
    if (!produto) {
      res.status(404).json({ error: "Produto não encontrado." });
      return;
    }
    if (tipo === "PERDA" && produto.estoque < quantidade) {
      throw new Error("Estoque insuficiente para registrar a perda.");
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      await tx.estoqueAjuste.create({
        data: {
          produtoId: produto.id,
          tipo,
          quantidade,
          motivo,
        },
      });
      return tx.produto.update({
        where: { id: produto.id },
        data: {
          estoque:
            tipo === "ENTRADA"
              ? { increment: quantidade }
              : { decrement: quantidade },
        },
      });
    });
    res.json(atualizado);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Não foi possível ajustar o estoque.",
    });
  }
});

produtosRouter.get("/:id", async (req, res) => {
  const produto = await prisma.produto.findUnique({
    where: { id: req.params.id },
  });
  if (!produto) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }
  res.json(produto);
});

produtosRouter.post("/", handleFotoUpload, async (req, res) => {
  try {
    const data = parseProdutoBody(req.body);
    let fotoUrl: string | null = null;
    if (req.file) {
      fotoUrl = await uploadProdutoFoto(req.file);
    }
    const produto = await prisma.produto.create({
      data: { ...data, fotoUrl },
    });
    res.status(201).json(produto);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar o produto.";
    res.status(400).json({ error: message });
  }
});

produtosRouter.put("/:id", handleFotoUpload, async (req, res) => {
  try {
    const atual = await prisma.produto.findUnique({
      where: { id: req.params.id },
    });
    if (!atual) {
      res.status(404).json({ error: "Produto não encontrado." });
      return;
    }

    const data = parseProdutoBody(req.body);
    const removerFoto =
      req.body.removerFoto === "true" || req.body.removerFoto === true;

    let fotoUrl = atual.fotoUrl;

    if (req.file) {
      fotoUrl = await uploadProdutoFoto(req.file);
      await deleteProdutoFoto(atual.fotoUrl);
    } else if (removerFoto) {
      await deleteProdutoFoto(atual.fotoUrl);
      fotoUrl = null;
    }

    const produto = await prisma.produto.update({
      where: { id: atual.id },
      data: { ...data, fotoUrl },
    });
    res.json(produto);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o produto.";
    res.status(400).json({ error: message });
  }
});

produtosRouter.delete("/:id", async (req, res) => {
  const atual = await prisma.produto.findUnique({
    where: { id: req.params.id },
  });
  if (!atual) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }

  const vendas = await prisma.itemVenda.count({
    where: { produtoId: atual.id },
  });
  if (vendas > 0) {
    const produto = await prisma.produto.update({
      where: { id: atual.id },
      data: { ativo: false },
    });
    res.json({
      produto,
      message: "Produto com histórico de venda foi desativado.",
    });
    return;
  }

  await deleteProdutoFoto(atual.fotoUrl);
  await prisma.produto.delete({ where: { id: atual.id } });
  res.status(204).end();
});
