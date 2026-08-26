-- CreateTable
CREATE TABLE "ContaReceber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "vendaId" TEXT,
    "descricao" TEXT,
    "valor" DECIMAL NOT NULL,
    "pago" DECIMAL NOT NULL DEFAULT 0,
    "vencimento" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContaReceber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContaReceber_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recebimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contaId" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "metodo" TEXT NOT NULL DEFAULT 'DINHEIRO',
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recebimento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaReceber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContaReceber_clienteId_idx" ON "ContaReceber"("clienteId");
CREATE INDEX "ContaReceber_status_idx" ON "ContaReceber"("status");
CREATE INDEX "ContaReceber_vendaId_idx" ON "ContaReceber"("vendaId");
CREATE INDEX "Recebimento_contaId_idx" ON "Recebimento"("contaId");
