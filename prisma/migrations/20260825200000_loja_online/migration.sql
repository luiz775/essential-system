-- AlterTable
ALTER TABLE "Venda" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'PDV';
ALTER TABLE "Venda" ADD COLUMN "frete" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Venda" ADD COLUMN "clienteNome" TEXT;
ALTER TABLE "Venda" ADD COLUMN "clienteWhatsapp" TEXT;
ALTER TABLE "Venda" ADD COLUMN "clienteEmail" TEXT;
ALTER TABLE "Venda" ADD COLUMN "tipoEntrega" TEXT;
ALTER TABLE "Venda" ADD COLUMN "cep" TEXT;
ALTER TABLE "Venda" ADD COLUMN "endereco" TEXT;
ALTER TABLE "Venda" ADD COLUMN "numero" TEXT;
ALTER TABLE "Venda" ADD COLUMN "bairro" TEXT;
ALTER TABLE "Venda" ADD COLUMN "cidade" TEXT;
ALTER TABLE "Venda" ADD COLUMN "uf" TEXT;
ALTER TABLE "Venda" ADD COLUMN "complemento" TEXT;
ALTER TABLE "Venda" ADD COLUMN "observacao" TEXT;

CREATE INDEX "Venda_origem_idx" ON "Venda"("origem");
CREATE INDEX "Venda_status_idx" ON "Venda"("status");
