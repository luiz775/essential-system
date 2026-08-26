import { prisma } from "../lib/prisma.js";
import { asNumber, money } from "../lib/money.js";

export async function getCaixaAberto() {
  return prisma.caixa.findFirst({
    where: { status: "ABERTO" },
    include: { movimentos: true },
    orderBy: { abertoEm: "desc" },
  });
}

export async function assertCaixaAberto() {
  const caixa = await getCaixaAberto();
  if (!caixa) {
    throw new Error("Abra o caixa do dia antes de vender.");
  }
  return caixa;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function resumoCaixa(caixaId: string) {
  const caixa = await prisma.caixa.findUnique({
    where: { id: caixaId },
    include: {
      movimentos: { orderBy: { createdAt: "desc" } },
      vendas: {
        where: { status: "CONCLUIDA" },
        include: {
          pagamentos: true,
          itens: { include: { produto: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!caixa) throw new Error("Caixa não encontrado.");

  const totais = {
    DINHEIRO: 0,
    PIX: 0,
    DEBITO: 0,
    CREDITO: 0,
  };

  let custoVendas = 0;
  for (const venda of caixa.vendas) {
    for (const pag of venda.pagamentos) {
      if (pag.metodo === "FIADO") continue;
      const metodo = pag.metodo as keyof typeof totais;
      if (metodo in totais) totais[metodo] += asNumber(pag.valor);
    }
    for (const item of venda.itens) {
      custoVendas += asNumber(item.produto.precoCusto) * item.quantidade;
    }
  }

  const sangrias = caixa.movimentos
    .filter((m) => m.tipo === "SANGRIA")
    .reduce((sum, m) => sum + asNumber(m.valor), 0);
  const suprimentos = caixa.movimentos
    .filter((m) => m.tipo === "SUPRIMENTO")
    .reduce((sum, m) => sum + asNumber(m.valor), 0);

  const fundoInicial = asNumber(caixa.fundoInicial);
  const totalVendas = caixa.vendas.reduce((sum, v) => sum + asNumber(v.total), 0);
  const lucro = money(totalVendas - custoVendas);
  const gavetaEsperada = money(fundoInicial + totais.DINHEIRO + suprimentos - sangrias);

  const diaFrom = startOfDay(caixa.abertoEm);
  const diaTo = caixa.fechadoEm
    ? addDays(startOfDay(caixa.fechadoEm), 1)
    : addDays(startOfDay(new Date()), 1);

  const comprasDia = await prisma.compra.findMany({
    where: { createdAt: { gte: diaFrom, lt: diaTo } },
    include: {
      produto: { select: { nome: true } },
      fornecedor: { select: { nome: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const totalCompras = money(
    comprasDia.reduce((s, c) => s + asNumber(c.valorUnitario) * c.quantidade, 0)
  );

  type Mov = {
    id: string;
    tipo: "VENDA" | "COMPRA" | "SANGRIA" | "SUPRIMENTO";
    descricao: string;
    entrada: number;
    saida: number;
    hora: string;
  };

  const movimentos: Mov[] = [];

  for (const venda of caixa.vendas) {
    const itens = venda.itens
      .map((i) => `${i.quantidade}x ${i.produto.nome}`)
      .join(", ");
    const recebido = venda.pagamentos
      .filter((p) => p.metodo !== "FIADO")
      .reduce((sum, p) => sum + asNumber(p.valor), 0);
    const fiado = venda.pagamentos
      .filter((p) => p.metodo === "FIADO")
      .reduce((sum, p) => sum + asNumber(p.valor), 0);
    movimentos.push({
      id: `v-${venda.id}`,
      tipo: "VENDA",
      descricao:
        (itens || "Venda") + (fiado > 0 ? ` · a receber ${money(fiado).toFixed(2)}` : ""),
      entrada: money(recebido),
      saida: 0,
      hora: venda.createdAt.toISOString(),
    });
  }
  for (const compra of comprasDia) {
    movimentos.push({
      id: `c-${compra.id}`,
      tipo: "COMPRA",
      descricao: `${compra.quantidade}x ${compra.produto.nome}${
        compra.fornecedor ? ` · ${compra.fornecedor.nome}` : ""
      }`,
      entrada: 0,
      saida: money(asNumber(compra.valorUnitario) * compra.quantidade),
      hora: compra.createdAt.toISOString(),
    });
  }
  for (const mov of caixa.movimentos) {
    movimentos.push({
      id: `m-${mov.id}`,
      tipo: mov.tipo as "SANGRIA" | "SUPRIMENTO",
      descricao: mov.motivo || (mov.tipo === "SANGRIA" ? "Sangria" : "Suprimento"),
      entrada: mov.tipo === "SUPRIMENTO" ? asNumber(mov.valor) : 0,
      saida: mov.tipo === "SANGRIA" ? asNumber(mov.valor) : 0,
      hora: mov.createdAt.toISOString(),
    });
  }

  movimentos.sort((a, b) => new Date(b.hora).getTime() - new Date(a.hora).getTime());

  const totalEntrada = money(movimentos.reduce((s, m) => s + m.entrada, 0));
  const totalSaida = money(movimentos.reduce((s, m) => s + m.saida, 0));

  return {
    caixa: {
      id: caixa.id,
      fundoInicial: caixa.fundoInicial,
      status: caixa.status,
      abertoEm: caixa.abertoEm,
      fechadoEm: caixa.fechadoEm,
    },
    totais: {
      dinheiro: money(totais.DINHEIRO),
      pix: money(totais.PIX),
      debito: money(totais.DEBITO),
      credito: money(totais.CREDITO),
      vendas: money(totalVendas),
    },
    sangrias: money(sangrias),
    suprimentos: money(suprimentos),
    fundoInicial,
    gavetaEsperada,
    quantidadeVendas: caixa.vendas.length,
    lucro,
    compras: {
      total: totalCompras,
      quantidade: comprasDia.length,
    },
    despesas: {
      total: money(sangrias),
      quantidade: caixa.movimentos.filter((m) => m.tipo === "SANGRIA").length,
    },
    movimentos,
    totaisMovimento: {
      entrada: totalEntrada,
      saida: totalSaida,
    },
  };
}

export async function historicoCaixas(mes?: Date) {
  const base = mes ?? new Date();
  const from = new Date(base.getFullYear(), base.getMonth(), 1);
  const to = new Date(base.getFullYear(), base.getMonth() + 1, 1);

  const caixas = await prisma.caixa.findMany({
    where: { abertoEm: { gte: from, lt: to } },
    orderBy: { abertoEm: "desc" },
  });

  const rows = [];
  for (const caixa of caixas) {
    const resumo = await resumoCaixa(caixa.id);
    rows.push({
      id: caixa.id,
      abertoEm: caixa.abertoEm,
      fechadoEm: caixa.fechadoEm,
      status: caixa.status,
      fundoInicial: resumo.fundoInicial,
      compras: resumo.compras.total,
      despesas: resumo.despesas.total,
      vendas: resumo.totais.vendas,
      saldo: resumo.gavetaEsperada,
      lucro: resumo.lucro,
    });
  }

  const lucro7Dias = [];
  const hoje = startOfDay(new Date());
  for (let i = 6; i >= 0; i--) {
    const dia = addDays(hoje, -i);
    const next = addDays(dia, 1);
    const vendas = await prisma.venda.findMany({
      where: {
        status: "CONCLUIDA",
        createdAt: { gte: dia, lt: next },
      },
      include: { itens: { include: { produto: true } } },
    });
    let fat = 0;
    let custo = 0;
    for (const v of vendas) {
      fat += asNumber(v.total);
      for (const item of v.itens) {
        custo += asNumber(item.produto.precoCusto) * item.quantidade;
      }
    }
    lucro7Dias.push({
      label: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      lucro: money(fat - custo),
    });
  }

  return { mes: from, caixas: rows, lucro7Dias };
}
