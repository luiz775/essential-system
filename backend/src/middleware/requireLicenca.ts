import type { NextFunction, Request, Response } from "express";
import { assertLicencaAtiva } from "../services/licenca.js";

const LIVRES = ["/api/health", "/api/auth", "/api/licenca"];

export async function requireLicenca(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS" || req.method === "GET" || req.method === "HEAD") {
    next();
    return;
  }

  if (LIVRES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
    next();
    return;
  }

  try {
    await assertLicencaAtiva();
    next();
  } catch (error) {
    if (error instanceof Error && error.message === "LICENCA_VENCIDA") {
      res.status(402).json({
        error: "Mensalidade vencida. Regularize o PIX para voltar a usar o sistema.",
      });
      return;
    }
    next(error);
  }
}
