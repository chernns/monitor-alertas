import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { env } from "../config/env.js";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Payload inválido" });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
    if (!user || !ok) return reply.code(401).send({ error: "Credenciais inválidas" });

    const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: "8h" });
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  });
}