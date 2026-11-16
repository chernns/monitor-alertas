import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export async function metricsRoutes(app: FastifyInstance) {
  app.get("/metrics", async () => {
    const [total, critical, sent, failed] = await Promise.all([
      prisma.businessEvent.count(),
      prisma.businessEvent.count({ where: { severity: "CRITICAL" } }),
      prisma.notificationLog.count({ where: { status: "SENT" } }),
      prisma.notificationLog.count({ where: { status: "FAILED" } }),
    ]);
    return { total, critical, sent, failed };
  });

  // Uma query só, com select (sem N+1)
  app.get("/notifications", async () =>
    prisma.notificationLog.findMany({
      include: {
        event: { select: { type: true, severity: true, device: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  );
}