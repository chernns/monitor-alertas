import { getChannel, QUEUE } from "./connection.js";
import type { EventInput } from "../schemas.js";

export async function publishEvent(event: EventInput) {
  const ch = await getChannel();
  ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(event)), { persistent: true });
}