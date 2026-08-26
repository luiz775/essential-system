import "./loadEnv.js";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { clientesRouter } from "./routes/clientes.js";
import { comprasRouter } from "./routes/compras.js";
import { caixaRouter } from "./routes/caixa.js";
import { fornecedoresRouter } from "./routes/fornecedores.js";
import { licencaRouter } from "./routes/licenca.js";
import { produtosRouter } from "./routes/produtos.js";
import { relatoriosRouter } from "./routes/relatorios.js";
import { contasReceberRouter } from "./routes/contasReceber.js";
import { vendasRouter } from "./routes/vendas.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { requireLicenca } from "./middleware/requireLicenca.js";
import { ensureAdminOperador } from "./services/operadores.js";
import { uploadsDir } from "./services/storage.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: true }));
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));
app.use(requireAuth);
app.use(requireLicenca);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);

app.use("/api/produtos", produtosRouter);
app.use("/api/vendas", vendasRouter);
app.use("/api/compras", comprasRouter);
app.use("/api/fornecedores", fornecedoresRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/contas-receber", contasReceberRouter);
app.use("/api/caixa", caixaRouter);
app.use("/api/licenca", licencaRouter);
app.use("/api/relatorios", relatoriosRouter);

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (error.message?.includes("JPG") || error.message?.includes("File too large")) {
      res.status(400).json({
        error:
          error.message.includes("large")
            ? "A foto deve ter no máximo 2 MB."
            : error.message,
      });
      return;
    }
    res.status(500).json({ error: error.message || "Erro interno." });
  }
);

app.listen(port, () => {
  console.log(`Essential System API em http://localhost:${port}`);
});

ensureAdminOperador().catch((err) => {
  console.error("Falha ao criar operador inicial:", err);
});
