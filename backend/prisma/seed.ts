import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const user = await prisma.user.upsert({
    where: { email: "teste@monitor.com" },
    update: {},
    create: { email: "teste@monitor.com", name: "Usuário Teste", passwordHash },
  });

  // Troque o sufixo por algo único seu: tópicos do ntfy.sh são públicos
  const sufixo = "issofunciona";
  const devices = [
    { name: "Servidor Web", ntfyTopic: `monitor-servidor-${sufixo}` },
    { name: "Banco de Dados", ntfyTopic: `monitor-banco-${sufixo}` },
    { name: "Sensor de Temperatura", ntfyTopic: `monitor-sensor-${sufixo}` },
  ];

  for (const d of devices) {
    await prisma.device.upsert({
      where: { ntfyTopic: d.ntfyTopic },
      update: {},
      create: { ...d, userId: user.id },
    });
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());