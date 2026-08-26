import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";

export async function ensureAdminOperador() {
  const count = await prisma.operador.count();
  if (count > 0) return;

  await prisma.operador.create({
    data: {
      nome: "Luiz Gustavo",
      usuario: "luiz",
      senhaHash: hashPassword("1234"),
      role: "ADMIN",
      ativo: true,
    },
  });
}
