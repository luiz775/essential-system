import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export type OperadorAuth = {
  id: string;
  nome: string;
  usuario: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      operador?: OperadorAuth;
    }
  }
}

const PUBLIC: { method?: string; path: string }[] = [
  { path: "/api/health" },
  { method: "POST", path: "/api/auth/login" },
  { method: "GET", path: "/api/licenca" },
];

export function isPublicRoute(req: Request) {
  if (!req.path.startsWith("/api")) return true;
  return PUBLIC.some(
    (rule) =>
      req.path === rule.path && (!rule.method || req.method === rule.method)
  );
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS" || isPublicRoute(req)) {
    next();
    return;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Faça login para continuar." });
    return;
  }

  const sessao = await prisma.sessao.findUnique({
    where: { token },
    include: { operador: true },
  });

  if (
    !sessao ||
    sessao.expiresAt.getTime() < Date.now() ||
    !sessao.operador.ativo
  ) {
    if (sessao) {
      await prisma.sessao.delete({ where: { id: sessao.id } }).catch(() => undefined);
    }
    res.status(401).json({ error: "Sessão expirada. Entre de novo." });
    return;
  }

  req.operador = {
    id: sessao.operador.id,
    nome: sessao.operador.nome,
    usuario: sessao.operador.usuario,
    role: sessao.operador.role,
  };
  next();
}
