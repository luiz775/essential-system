import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asNumber, money } from "../lib/money.js";

export const clientesRouter = Router();

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseBody(body: Record<string, unknown>) {
  const nome = String(body.nome ?? "").trim();
  if (!nome) throw new Error("Nome do cliente é obrigatório.");
  const tipo = String(body.tipo ?? "VAREJO").toUpperCase();
  if (tipo !== "VAREJO" && tipo !== "ATACADO") {
    throw new Error("Tipo inválido. Use Varejo ou Atacado.");
  }
  return {
    nome,
    documento: body.documento ? String(body.documento).trim() : null,
    tipo,
    telefone: body.telefone ? String(body.telefone).trim() : null,
    whatsapp: body.whatsapp ? String(body.whatsapp).trim() : null,
    email: body.email ? String(body.email).trim() : null,
    produtosDescricao: body.produtosDescricao
      ? String(body.produtosDescricao).trim()
      : null,
    endereco: body.endereco ? String(body.endereco).trim() : null,
    numero: body.numero ? String(body.numero).trim() : null,
    bairro: body.bairro ? String(body.bairro).trim() : null,
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

clientesRouter.get("/", async (_req, res) => {
  const mesFrom = startOfMonth();
  const clientes = await prisma.cliente.findMany({
    include: {
      vendas: {
        where: { status: { in: ["CONCLUIDA", "PAGO", "ENVIADO"] } },
        select: { id: true, total: true, createdAt: true },
      },
    },
    orderBy: { nome: "asc" },
  });

  const rows = clientes.map((c) => {
    const totalVendido = money(
      c.vendas.reduce((sum, v) => sum + asNumber(v.total), 0)
    );
    const vendasMes = money(
      c.vendas
        .filter((v) => v.createdAt >= mesFrom)
        .reduce((sum, v) => sum + asNumber(v.total), 0)
    );
    const ultima = c.vendas
      .map((v) => v.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      id: c.id,
      nome: c.nome,
      documento: c.documento,
      tipo: c.tipo,
      telefone: c.telefone,
      whatsapp: c.whatsapp,
      email: c.email,
      produtosDescricao: c.produtosDescricao,
      endereco: c.endereco,
      numero: c.numero,
      bairro: c.bairro,
      cidade: c.cidade,
      uf: c.uf,
      cep: c.cep,
      observacao: c.observacao,
      ativo: c.ativo,
      createdAt: c.createdAt,
      vendasCount: c.vendas.length,
      totalVendido,
      vendasMes,
      ultimaVenda: ultima ?? null,
    };
  });

  const totalVendido = money(rows.reduce((s, r) => s + r.totalVendido, 0));
  const vendasMes = money(rows.reduce((s, r) => s + r.vendasMes, 0));
  const maior = [...rows].sort((a, b) => b.totalVendido - a.totalVendido)[0];

  res.json({
    resumo: {
      total: rows.length,
      ativos: rows.filter((r) => r.ativo).length,
      totalVendido,
      vendasMes,
      maiorCliente: maior
        ? { id: maior.id, nome: maior.nome, total: maior.totalVendido }
        : null,
    },
    clientes: rows,
  });
});

clientesRouter.get("/simples", async (_req, res) => {
  const clientes = await prisma.cliente.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  res.json(clientes);
});

clientesRouter.post("/", async (req, res) => {
  try {
    const data = parseBody(req.body);
    const cliente = await prisma.cliente.create({ data });
    res.status(201).json(cliente);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Falha ao criar cliente.",
    });
  }
});

clientesRouter.put("/:id", async (req, res) => {
  try {
    const data = parseBody(req.body);
    const cliente = await prisma.cliente.update({
      where: { id: req.params.id },
      data,
    });
    res.json(cliente);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Falha ao atualizar.",
    });
  }
});

clientesRouter.delete("/:id", async (req, res) => {
  const vendas = await prisma.venda.count({
    where: { clienteId: req.params.id },
  });
  const contas = await prisma.contaReceber.count({
    where: { clienteId: req.params.id },
  });
  if (vendas > 0 || contas > 0) {
    await prisma.cliente.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });
    res.json({ message: "Cliente inativado (há vendas vinculadas)." });
    return;
  }
  await prisma.cliente.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
