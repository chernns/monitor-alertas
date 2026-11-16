import { getChannel, QUEUE } from "./connection.js";
import { EventSchema } from "../schemas.js";
import { prisma } from "../db.js";
import { broadcast } from "../ws/gateway.js";
import { dispatchNtfy } from "../ntfy/dispatcher.js";

export async function startConsumer() {
  const ch = await getChannel();
  await ch.prefetch(10);

  await ch.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const data = EventSchema.parse(JSON.parse(msg.content.toString()));

      let event;
      try {
        event = await prisma.businessEvent.create({
          data: { ...data, publishedAt: new Date(data.publishedAt) },
          include: { device: true },
        });
      } catch (e: any) {
        if (e.code === "P2002") {
          // externalId repetido: já processado, descarta sem duplicar
          console.log(`Duplicado ignorado: ${data.externalId}`);
          ch.ack(msg);
          return;
        }
        throw e;
      }

      broadcast({ type: "event", event });

      if (event.severity === "CRITICAL") {
        await dispatchNtfy(event, event.device);
      }

      ch.ack(msg);
    } catch (err) {
      console.error("Erro ao processar mensagem:", err);
      ch.nack(msg, false, false); // não reenfileira (evita loop infinito)
    }
  });

  console.log("Consumidor pronto, aguardando eventos...");
}