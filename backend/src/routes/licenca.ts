import { Router } from "express";
import { autorizarRenovacao, getLicencaStatus, renovarLicenca } from "../services/licenca.js";

export const licencaRouter = Router();

licencaRouter.get("/", async (_req, res) => {
  res.json(await getLicencaStatus());
});

licencaRouter.post("/renovar", async (req, res) => {
  const chave =
    typeof req.body?.chaveMestre === "string"
      ? req.body.chaveMestre
      : typeof req.headers["x-licenca-key"] === "string"
        ? req.headers["x-licenca-key"]
        : undefined;

  if (!autorizarRenovacao(chave, req.operador?.role)) {
    res.status(403).json({ error: "Chave de liberação inválida." });
    return;
  }

  try {
    const meses = Number(req.body?.meses ?? 1);
    res.json(await renovarLicenca(meses));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível renovar.";
    res.status(400).json({ error: message });
  }
});
