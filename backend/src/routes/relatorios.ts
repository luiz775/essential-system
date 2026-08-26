import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asNumber, money } from "../lib/money.js";
import { getCaixaAberto, resumoCaixa } from "../services/caixa.js";

export const relatoriosRouter = Router();

const SALE_STATUS = ["CONCLUIDA", "PAGO", "ENVIADO"];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return money(((current - previous) / previous) * 100);
}

async function vendasNoPeriodo(from: Date, to: Date) {
  return prisma.venda.findMany({
    where: {
      status: { in: SALE_STATUS },
      createdAt: { gte: from, lt: to },
    },
    include: {
      itens: { include: { produto: true } },
      pagamentos: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

function resumir(vendas: Awaited<ReturnType<typeof vendasNoPeriodo>>) {
  let faturamento = 0;
  let lucro = 0;
  let unidades = 0;
  let fisica = 0;
  let online = 0;
  const pagamentos = { dinheiro: 0, pix: 0, debito: 0, credito: 0, fiado: 0 };

  for (const venda of vendas) {
    const total = asNumber(venda.total);
    const custo = venda.itens.reduce(
      (sum, item) => sum + asNumber(item.produto.precoCusto) * item.quantidade,
      0
    );
    faturamento += total;
    lucro += total - custo;
    unidades += venda.itens.reduce((sum, item) => sum + item.quantidade, 0);
    if (venda.origem === "ONLINE") online += total;
    else fisica += total;
    for (const pag of venda.pagamentos) {
      if (pag.metodo === "DINHEIRO") pagamentos.dinheiro += asNumber(pag.valor);
      if (pag.metodo === "PIX") pagamentos.pix += asNumber(pag.valor);
      if (pag.metodo === "DEBITO") pagamentos.debito += asNumber(pag.valor);
      if (pag.metodo === "CREDITO") pagamentos.credito += asNumber(pag.valor);
      if (pag.metodo === "FIADO") pagamentos.fiado += asNumber(pag.valor);
    }
  }

  return {
    faturamento: money(faturamento),
    lucro: money(lucro),
    tickets: vendas.length,
    unidades,
    fisica: money(fisica),
    online: money(online),
    pagamentos: {
      dinheiro: money(pagamentos.dinheiro),
      pix: money(pagamentos.pix),
      debito: money(pagamentos.debito),
      credito: money(pagamentos.credito),
      fiado: money(pagamentos.fiado),
    },
  };
}

relatoriosRouter.get("/mais-vendidos", async (req, res) => {
  const now = new Date();
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = req.query.to ? new Date(String(req.query.to)) : now;

  const itens = await prisma.itemVenda.findMany({
    where: {
      venda: {
        status: { in: SALE_STATUS },
        createdAt: { gte: from, lte: to },
      },
    },
    include: { produto: true },
  });

  const map = new Map<
    string,
    { produto: (typeof itens)[number]["produto"]; quantidade: number; faturamento: number }
  >();

  for (const item of itens) {
    const atual = map.get(item.produtoId) ?? {
      produto: item.produto,
      quantidade: 0,
      faturamento: 0,
    };
    atual.quantidade += item.quantidade;
    atual.faturamento += asNumber(item.precoUnitario) * item.quantidade;
    map.set(item.produtoId, atual);
  }

  const ranking = Array.from(map.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 15)
    .map((row) => ({
      ...row,
      faturamento: money(row.faturamento),
    }));

  res.json({ from, to, ranking });
});

relatoriosRouter.get("/gerencial", async (req, res) => {
  const tipo = String(req.query.tipo ?? "mensal").toLowerCase();
  const now = new Date();
  const ano = Number(req.query.ano ?? now.getFullYear());
  const mes = Number(req.query.mes ?? now.getMonth() + 1);

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    res.status(400).json({ error: "Ano inválido." });
    return;
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    res.status(400).json({ error: "Mês inválido." });
    return;
  }

  const from = new Date(ano, mes - 1, 1);
  const to = new Date(ano, mes, 1);
  const label = from.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const [vendas, compras, clientes] = await Promise.all([
    vendasNoPeriodo(from, to),
    prisma.compra.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: { produto: true, fornecedor: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cliente.findMany({
      where: { ativo: true },
      include: {
        vendas: {
          where: {
            status: { in: SALE_STATUS },
            createdAt: { gte: from, lt: to },
          },
          select: { id: true, total: true },
        },
      },
      orderBy: { nome: "asc" },
    }),
  ]);

  const resumo = resumir(vendas);
  const totalCompras = money(
    compras.reduce((s, c) => s + asNumber(c.valorUnitario) * c.quantidade, 0)
  );
  const despesasCaixa = await prisma.movimentoCaixa.findMany({
    where: {
      tipo: "SANGRIA",
      createdAt: { gte: from, lt: to },
    },
  });
  const totalDespesas = money(
    despesasCaixa.reduce((s, m) => s + asNumber(m.valor), 0)
  );

  const rankingMap = new Map<
    string,
    {
      id: string;
      nome: string;
      marca: string;
      quantidade: number;
      faturamento: number;
    }
  >();
  for (const venda of vendas) {
    for (const item of venda.itens) {
      const atual = rankingMap.get(item.produtoId) ?? {
        id: item.produto.id,
        nome: item.produto.nome,
        marca: item.produto.marca,
        quantidade: 0,
        faturamento: 0,
      };
      atual.quantidade += item.quantidade;
      atual.faturamento += asNumber(item.precoUnitario) * item.quantidade;
      rankingMap.set(item.produtoId, atual);
    }
  }
  const topProdutos = Array.from(rankingMap.values())
    .sort((a, b) => b.faturamento - a.faturamento)
    .map((row) => ({ ...row, faturamento: money(row.faturamento) }));

  const clientesRows = clientes
    .map((c) => {
      const total = money(c.vendas.reduce((s, v) => s + asNumber(v.total), 0));
      return {
        id: c.id,
        nome: c.nome,
        documento: c.documento,
        tipo: c.tipo,
        vendasCount: c.vendas.length,
        totalVendido: total,
      };
    })
    .filter((c) => c.vendasCount > 0)
    .sort((a, b) => b.totalVendido - a.totalVendido);

  const vendasRows = vendas.map((v) => ({
    id: v.id,
    createdAt: v.createdAt,
    origem: v.origem,
    clienteNome: v.clienteNome,
    total: asNumber(v.total),
    itens: v.itens
      .map((item) => `${item.quantidade}x ${item.produto.nome}`)
      .join(", "),
    pagamento: v.pagamentos.map((p) => p.metodo).join(" + "),
  }));

  const comprasRows = compras.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    produto: c.produto.nome,
    marca: c.produto.marca,
    fornecedor: c.fornecedor?.nome ?? "—",
    quantidade: c.quantidade,
    total: money(asNumber(c.valorUnitario) * c.quantidade),
  }));

  const tiposValidos = ["mensal", "vendas", "produtos", "clientes", "compras"];
  if (!tiposValidos.includes(tipo)) {
    res.status(400).json({
      error: `Tipo inválido. Use: ${tiposValidos.join(", ")}.`,
    });
    return;
  }

  res.json({
    tipo,
    ano,
    mes,
    label,
    from: from.toISOString(),
    to: to.toISOString(),
    resumo: {
      ...resumo,
      compras: totalCompras,
      despesas: totalDespesas,
      resultado: money(resumo.lucro - totalCompras - totalDespesas),
    },
    topProdutos,
    clientes: clientesRows,
    vendas: vendasRows,
    compras: comprasRows,
  });
});

relatoriosRouter.get("/painel", async (_req, res) => {
  const now = new Date();
  const hojeFrom = startOfDay(now);
  const hojeTo = addDays(hojeFrom, 1);
  const ontemFrom = addDays(hojeFrom, -1);
  const mesFrom = startOfMonth(now);

  const seisMesesFrom = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));

  const [vendasHoje, vendasOntem, vendasMes, vendasSeisMeses, produtos, caixa] =
    await Promise.all([
      vendasNoPeriodo(hojeFrom, hojeTo),
      vendasNoPeriodo(ontemFrom, hojeFrom),
      vendasNoPeriodo(mesFrom, now),
      vendasNoPeriodo(seisMesesFrom, now),
      prisma.produto.findMany({ where: { ativo: true } }),
      getCaixaAberto(),
    ]);

  const hoje = resumir(vendasHoje);
  const ontem = resumir(vendasOntem);
  const mes = resumir(vendasMes);

  const estoqueBaixo = produtos
    .filter((p) => p.estoque <= p.estoqueMin)
    .sort((a, b) => a.estoque - b.estoque)
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      marca: p.marca,
      estoque: p.estoque,
      estoqueMin: p.estoqueMin,
      fotoUrl: p.fotoUrl,
    }));

  const rankingMap = new Map<
    string,
    { id: string; nome: string; marca: string; fotoUrl: string | null; quantidade: number; faturamento: number }
  >();
  for (const venda of vendasMes) {
    for (const item of venda.itens) {
      const atual = rankingMap.get(item.produtoId) ?? {
        id: item.produto.id,
        nome: item.produto.nome,
        marca: item.produto.marca,
        fotoUrl: item.produto.fotoUrl,
        quantidade: 0,
        faturamento: 0,
      };
      atual.quantidade += item.quantidade;
      atual.faturamento += asNumber(item.precoUnitario) * item.quantidade;
      rankingMap.set(item.produtoId, atual);
    }
  }
  const topProdutos = Array.from(rankingMap.values())
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, 5)
    .map((row) => ({ ...row, faturamento: money(row.faturamento) }));

  const lucro6Meses = [];
  for (let i = 5; i >= 0; i--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = startOfMonth(cursor);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const bloco = resumir(
      vendasSeisMeses.filter((v) => v.createdAt >= from && v.createdAt < to)
    );
    lucro6Meses.push({
      label: cursor.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      lucro: bloco.lucro,
      faturamento: bloco.faturamento,
    });
  }

  const series30d = [];
  for (let i = 29; i >= 0; i--) {
    const from = addDays(hojeFrom, -i);
    const to = addDays(from, 1);
    const bloco = resumir(
      vendasSeisMeses.filter((v) => v.createdAt >= from && v.createdAt < to)
    );
    series30d.push({
      label: from.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      faturamento: bloco.faturamento,
      lucro: bloco.lucro,
      tickets: bloco.tickets,
      fisica: bloco.fisica,
      online: bloco.online,
    });
  }

  function mapVenda(venda: (typeof vendasHoje)[number]) {
    return {
      id: venda.id,
      createdAt: venda.createdAt,
      origem: venda.origem,
      total: asNumber(venda.total),
      itens: venda.itens
        .map((item) => `${item.quantidade}x ${item.produto.nome}`)
        .join(", "),
      pagamento: venda.pagamentos.map((p) => p.metodo).join(" + "),
    };
  }

  let caixaResumo = null;
  if (caixa) {
    const resumo = await resumoCaixa(caixa.id);
    caixaResumo = {
      aberto: true,
      fundoInicial: resumo.fundoInicial,
      gavetaEsperada: resumo.gavetaEsperada,
      quantidadeVendas: resumo.quantidadeVendas,
      abertoEm: caixa.abertoEm,
    };
  }

  res.json({
    caixa: caixaResumo,
    hoje: {
      ...hoje,
      vsOntem: {
        faturamento: pctChange(hoje.faturamento, ontem.faturamento),
        lucro: pctChange(hoje.lucro, ontem.lucro),
      },
    },
    mes: {
      ...mes,
      produtosAtivos: produtos.length,
      estoqueBaixo: estoqueBaixo.length,
    },
    estoqueBaixo,
    topProdutos,
    lucro6Meses,
    series30d,
    vendasHoje: vendasHoje.map(mapVenda),
    vendasRecentes: vendasMes.slice(0, 25).map(mapVenda),
  });
});
