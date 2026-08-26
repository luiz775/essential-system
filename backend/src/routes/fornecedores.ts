import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asNumber, money } from "../lib/money.js";

export const fornecedoresRouter = Router();

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseBody(body: Record<string, unknown>) {
  const nome = String(body.nome ?? "").trim();
  if (!nome) throw new Error("Nome do fornecedor é obrigatório.");
  return {
    nome,
    cnpj: body.cnpj ? String(body.cnpj).trim() : null,
    telefone: body.telefone ? String(body.telefone).trim() : null,
    whatsapp: body.whatsapp ? String(body.whatsapp).trim() : null,
    email: body.email ? String(body.email).trim() : null,
    produtosDescricao: body.produtosDescricao
      ? String(body.produtosDescricao).trim()
      : null,
    endereco: body.endereco ? String(body.endereco).trim() : null,
    cidade: body.cidade ? String(body.cidade).trim() : null,
    uf: body.uf ? String(body.uf).trim().toUpperCase().slice(0, 2) : null,
    cep: body.cep ? String(body.cep).trim() : null,
    observacao: body.observacao ? String(body.observacao).trim() : null,
    ativo:
      body.ativo === false || body.ativo === "false" || body.ativo === "0"
        ? false
        : true,
  };
}

fornecedoresRouter.get("/", async (_req, res) => {
  const mesFrom = startOfMonth();
  const fornecedores = await prisma.fornecedor.findMany({
    include: {
      compras: {
        select: {
          id: true,
          quantidade: true,
          valorUnitario: true,
          createdAt: true,
        },
      },
    },
    orderBy: { nome: "asc" },
  });

  const rows = fornecedores.map((f) => {
    const totalComprado = money(
      f.compras.reduce(
        (sum, c) => sum + asNumber(c.valorUnitario) * c.quantidade,
        0
      )
    );
    const comprasMes = money(
      f.compras
        .filter((c) => c.createdAt >= mesFrom)
        .reduce((sum, c) => sum + asNumber(c.valorUnitario) * c.quantidade, 0)
    );
    const ultima = f.compras
      .map((c) => c.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      id: f.id,
      nome: f.nome,
      cnpj: f.cnpj,
      telefone: f.telefone,
      whatsapp: f.whatsapp,
      email: f.email,
      produtosDescricao: f.produtosDescricao,
      endereco: f.endereco,
      cidade: f.cidade,
      uf: f.uf,
      cep: f.cep,
      observacao: f.observacao,
      ativo: f.ativo,
      createdAt: f.createdAt,
      comprasCount: f.compras.length,
      totalComprado,
      comprasMes,
      ultimaCompra: ultima ?? null,
    };
  });

  const totalComprado = money(rows.reduce((s, r) => s + r.totalComprado, 0));
  const comprasMes = money(rows.reduce((s, r) => s + r.comprasMes, 0));
  const maior = [...rows].sort((a, b) => b.totalComprado - a.totalComprado)[0];

  res.json({
    resumo: {
      total: rows.length,
      ativos: rows.filter((r) => r.ativo).length,
      totalComprado,
      comprasMes,
      maiorFornecedor: maior
        ? { id: maior.id, nome: maior.nome, total: maior.totalComprado }
        : null,
    },
    fornecedores: rows,
  });
});

fornecedoresRouter.get("/simples", async (_req, res) => {
  const fornecedores = await prisma.fornecedor.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  res.json(fornecedores);
});

fornecedoresRouter.post("/", async (req, res) => {
  try {
    const data = parseBody(req.body);
    const fornecedor = await prisma.fornecedor.create({ data });
    res.status(201).json(fornecedor);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Falha ao criar fornecedor.",
    });
  }
});

fornecedoresRouter.put("/:id", async (req, res) => {
  try {
    const data = parseBody(req.body);
    const fornecedor = await prisma.fornecedor.update({
      where: { id: req.params.id },
      data,
    });
    res.json(fornecedor);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Falha ao atualizar.",
    });
  }
});

fornecedoresRouter.delete("/:id", async (req, res) => {
  const compras = await prisma.compra.count({
    where: { fornecedorId: req.params.id },
  });
  if (compras > 0) {
    await prisma.fornecedor.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });
    res.json({ message: "Fornecedor inativado (há compras vinculadas)." });
    return;
  }
  await prisma.fornecedor.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
