import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { newSessionToken, verifyPassword } from "../lib/password.js";

export const authRouter = Router();

const SESSION_DAYS = 30;

function publicOperador(op: { id: string; nome: string; usuario: string; role: string }) {
  return { id: op.id, nome: op.nome, usuario: op.usuario, role: op.role };
}

authRouter.post("/login", async (req, res) => {
  const usuario = String(req.body?.usuario ?? "")
    .trim()
    .toLowerCase();
  const senha = String(req.body?.senha ?? "");
  if (!usuario || !senha) {
    res.status(400).json({ error: "Informe usuário e senha." });
    return;
  }

  const operador = await prisma.operador.findUnique({ where: { usuario } });
  if (!operador || !operador.ativo || !verifyPassword(senha, operador.senhaHash)) {
    res.status(401).json({ error: "Usuário ou senha inválidos." });
    return;
  }

  const token = newSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.sessao.create({
    data: { token, operadorId: operador.id, expiresAt },
  });

  res.json({
    token,
    operador: publicOperador(operador),
    expiresAt: expiresAt.toISOString(),
  });
});

authRouter.get("/me", async (req, res) => {
  if (!req.operador) {
    res.status(401).json({ error: "Faça login para continuar." });
    return;
  }
  res.json({ operador: req.operador });
});

authRouter.post("/logout", async (req, res) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token) {
    await prisma.sessao.deleteMany({ where: { token } });
  }
  res.status(204).end();
});
