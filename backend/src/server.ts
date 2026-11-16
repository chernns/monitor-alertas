import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { prisma } from "./db.js";
import { authRoutes } from "./routes/auth.js";
import { eventRoutes } from "./routes/events.js";
import { initGateway } from "./ws/gateway.js";
import { startConsumer } from "./broker/consumer.js";
import { metricsRoutes } from "./routes/metrics.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "ok", time: new Date().toISOString() };
});

await app.register(authRoutes);
await app.register(eventRoutes);
await app.register(metricsRoutes);

await app.listen({ port: env.PORT, host: "0.0.0.0" });
initGateway(app.server);
await startConsumer();