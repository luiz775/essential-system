import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const produtos = [
  {
    nome: "Malbec Tradicional",
    marca: "O Boticário",
    familia: "Amadeirado",
    volumeMl: 100,
    sku: "BOT-MAL-100",
    codigoBarras: "7891033700011",
    descricao: "Madeira, especiarias e um fundo quente de âmbar.",
    precoCusto: 95,
    precoVenda: 189.9,
    estoque: 18,
    estoqueMin: 4,
  },
  {
    nome: "Good Girl",
    marca: "Carolina Herrera",
    familia: "Floral oriental",
    volumeMl: 80,
    sku: "CH-GG-80",
    codigoBarras: "8411061926356",
    descricao: "Jasmim, cacau e tonka.",
    precoCusto: 280,
    precoVenda: 649,
    estoque: 7,
    estoqueMin: 3,
  },
  {
    nome: "Ferrari Black",
    marca: "Ferrari",
    familia: "Amadeirado aromático",
    volumeMl: 125,
    sku: "FE-BK-125",
    codigoBarras: "8002135118014",
    descricao: "Maçã, café e sândalo.",
    precoCusto: 70,
    precoVenda: 149.9,
    estoque: 2,
    estoqueMin: 5,
  },
  {
    nome: "Kaiak Clássico",
    marca: "Natura",
    familia: "Aquático",
    volumeMl: 100,
    sku: "NAT-KAI-100",
    codigoBarras: "7891033700028",
    descricao: "Notas marinhas e cítricas.",
    precoCusto: 68,
    precoVenda: 139.9,
    estoque: 24,
    estoqueMin: 6,
  },
  {
    nome: "Sauvage",
    marca: "Importado",
    familia: "Aromático fresco",
    volumeMl: 100,
    sku: "IMP-SAU-100",
    codigoBarras: "3348901368247",
    descricao: "Bergamota, pimenta e ambroxan.",
    precoCusto: 320,
    precoVenda: 790,
    estoque: 0,
    estoqueMin: 3,
  },
  {
    nome: "Inspiração 212 VIP",
    marca: "Contratipo",
    familia: "Gourmand",
    volumeMl: 100,
    sku: "CT-212-100",
    codigoBarras: "7891000002124",
    descricao: "Rum, baunilha e pimenta.",
    precoCusto: 28,
    precoVenda: 79.9,
    estoque: 31,
    estoqueMin: 8,
  },
];

async function main() {
  await prisma.pagamento.deleteMany();
  await prisma.itemVenda.deleteMany();
  await prisma.movimentoCaixa.deleteMany();
  await prisma.estoqueAjuste.deleteMany();
  await prisma.venda.deleteMany();
  await prisma.caixa.deleteMany();
  await prisma.produto.deleteMany();

  for (const produto of produtos) {
    await prisma.produto.create({ data: produto });
  }

  const vencimento = new Date();
  vencimento.setMonth(vencimento.getMonth() + 12);

  await prisma.licenca.upsert({
    where: { id: "unica" },
    update: {
      lojaNome: "Essential System",
      pixNome: "Daniel Gustavo Da Silva",
      pixChave: "+5567992083126",
    },
    create: {
      id: "unica",
      vencimento,
      toleranciaDias: 5,
      pixChave: "+5567992083126",
      pixNome: "Daniel Gustavo Da Silva",
      lojaNome: "Essential System",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
