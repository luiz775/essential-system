-- AlterTable
ALTER TABLE "Produto" ADD COLUMN "codigoBarras" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigoBarras_key" ON "Produto"("codigoBarras");

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN "subtotal" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Venda" ADD COLUMN "descontoTipo" TEXT NOT NULL DEFAULT 'VALOR';
ALTER TABLE "Venda" ADD COLUMN "descontoInput" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Venda" ADD COLUMN "descontoValor" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Venda" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CONCLUIDA';
ALTER TABLE "Venda" ADD COLUMN "caixaId" TEXT;
ALTER TABLE "Venda" ADD COLUMN "canceladaEm" DATETIME;

UPDATE "Venda" SET "subtotal" = "total";

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendaId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "recebido" DECIMAL,
    "troco" DECIMAL,
    "parcelas" INTEGER,
    CONSTRAINT "Pagamento_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Caixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fundoInicial" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "abertoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadoEm" DATETIME
);

-- CreateTable
CREATE TABLE "MovimentoCaixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caixaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "motivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentoCaixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstoqueAjuste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produtoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstoqueAjuste_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Licenca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vencimento" DATETIME NOT NULL,
    "toleranciaDias" INTEGER NOT NULL DEFAULT 5,
    "pixChave" TEXT NOT NULL,
    "pixNome" TEXT NOT NULL,
    "lojaNome" TEXT NOT NULL DEFAULT 'Essence Maison'
);

-- CreateIndex
CREATE INDEX "Pagamento_vendaId_idx" ON "Pagamento"("vendaId");
CREATE INDEX "MovimentoCaixa_caixaId_idx" ON "MovimentoCaixa"("caixaId");
CREATE INDEX "EstoqueAjuste_produtoId_idx" ON "EstoqueAjuste"("produtoId");
