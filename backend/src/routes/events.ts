import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { EventSchema } from "../schemas.js";
import { publishEvent } from "../broker/publisher.js";
import { prisma } from "../db.js";

export async function eventRoutes(app: FastifyInstance) {
  // Publica no broker. externalId e publishedAt são preenchidos se não vierem.
  app.post("/events", async (req, reply) => {
    const body = { ...(req.body as object) } as any;
    body.externalId ??= randomUUID();
    body.publishedAt ??= new Date().toISOString();

    const parsed = EventSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    await publishEvent(parsed.data);
    return reply.code(202).send({ accepted: true, externalId: parsed.data.externalId });
  });

  // Uma única query com include (sem N+1)
  app.get("/events", async () => {
    return prisma.businessEvent.findMany({
      include: { device: true, notifications: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  app.get("/devices", async () => prisma.device.findMany());
}