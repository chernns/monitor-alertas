import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  RABBITMQ_URL: z.string().default("amqp://guest:guest@localhost:5672"),
  JWT_SECRET: z.string().default("troque-este-segredo"),
  NTFY_URL: z.string().default("https://ntfy.sh"),
  APP_URL: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().default(3000),
});

export const env = EnvSchema.parse(process.env);