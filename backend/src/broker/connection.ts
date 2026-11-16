import amqp from "amqplib";
import { env } from "../config/env.js";

export const QUEUE = "events";

let channel: amqp.Channel | null = null;

export async function getChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  const conn = await amqp.connect(env.RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });
  return channel;
}