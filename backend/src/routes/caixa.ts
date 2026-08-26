import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { toDecimal } from "../lib/money.js";
import {
  assertCaixaAberto,
  getCaixaAberto,
  historicoCaixas,
  resumoCaixa,
} from "../services/caixa.js";

export const caixaRouter = Router();

caixaRouter.get("/atual", async (_req, res) => {
  const caixa = await getCaixaAberto();
  if (!caixa) {
    res.json({ caixa: null, resumo: null });
    return;
  }
  const resumo = await resumoCaixa(caixa.id);
  res.json({ caixa: resumo.caixa, resumo });
});

caixaRouter.get("/historico", async (req, res) => {
  const mes = req.query.mes ? new Date(String(req.query.mes)) : new Date();
  res.json(await historicoCaixas(mes));
});

caixaRouter.get("/:id/resumo", async (req, res) => {
  try {
    res.json(await resumoCaixa(req.params.id));
  } catch (error) {
    res
      .status(404)
      .json({ error: error instanceof Error ? error.message : "Caixa não encontrado." });
  }
});

caixaRouter.post("/abrir", async (req, res) => {
  const aberto = await getCaixaAberto();
  if (aberto) {
    res.status(400).json({ error: "Já existe um caixa aberto." });
    return;
  }
  const fundoInicial = Number(req.body?.fundoInicial);
  if (!Number.isFinite(fundoInicial) || fundoInicial < 0) {
    res.status(400).json({ error: "Informe o valor inicial de troco." });
    return;
  }
  const caixa = await prisma.caixa.create({
    data: { fundoInicial: toDecimal(fundoInicial) },
  });
  res.status(201).json(caixa);
});

caixaRouter.post("/movimento", async (req, res) => {
  try {
    const caixa = await assertCaixaAberto();
    const tipo = String(req.body?.tipo ?? "").toUpperCase();
    const valor = Number(req.body?.valor);
    const motivo = req.body?.motivo ? String(req.body.motivo) : null;
    if (tipo !== "SANGRIA" && tipo !== "SUPRIMENTO") {
      throw new Error("Tipo inválido.");
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error("Valor inválido.");
    }
    const movimento = await prisma.movimentoCaixa.create({
      data: {
        caixaId: caixa.id,
        tipo,
        valor: toDecimal(valor),
        motivo,
      },
    });
    res.status(201).json({ movimento, resumo: await resumoCaixa(caixa.id) });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : "Falha no movimento." });
  }
});

caixaRouter.post("/fechar", async (_req, res) => {
  try {
    const caixa = await assertCaixaAberto();
    const resumo = await resumoCaixa(caixa.id);
    const fechado = await prisma.caixa.update({
      where: { id: caixa.id },
      data: { status: "FECHADO", fechadoEm: new Date() },
    });
    res.json({ caixa: fechado, resumo });
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : "Não foi possível fechar." });
  }
});
