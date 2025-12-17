import { prisma } from "../config/database";
import bcrypt from "bcryptjs";

async function createAdmin() {
  const args = process.argv.slice(2);
  
  const name = args[0] || "Administrador";
  const email = args[1] || "admin@educarize.com";
  const password = args[2] || "admin123";

  console.log("Criando usuário administrador...");
  console.log(`Nome: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Senha: ${password}`);

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`\nUsuário com email ${email} já existe!`);
      console.log("Atualizando para ADMIN...");
      
      const passwordHash = await bcrypt.hash(password, 10);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: "ADMIN",
          passwordHash,
        },
      });
      
      console.log(`\nUsuário atualizado para ADMIN:`);
      console.log(`   ID: ${updated.id}`);
      console.log(`   Nome: ${updated.name}`);
      console.log(`   Email: ${updated.email}`);
      console.log(`   Role: ${updated.role}`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "ADMIN",
      },
    });

    console.log(`\nUsuário administrador criado com sucesso!`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nome: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`\nCredenciais de acesso:`);
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}`);
  } catch (error: any) {
    console.error("\nErro ao criar usuário administrador:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

