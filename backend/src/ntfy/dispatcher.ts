import type { BusinessEvent, Device } from "@prisma/client";
import { prisma } from "../db.js";
import { env } from "../config/env.js";

export async function dispatchNtfy(event: BusinessEvent, device: Device) {
  const log = await prisma.notificationLog.create({ data: { eventId: event.id } });
  try {
    const res = await fetch(`${env.NTFY_URL}/${device.ntfyTopic}`, {
      method: "POST",
      headers: {
        Title: `Alerta critico: ${event.type}`,
        Priority: "5",
        Tags: "rotating_light,warning",
        Click: `${env.APP_URL}`,
      },
      body: `${device.name}: ${JSON.stringify(event.payload)}`,
      signal: AbortSignal.timeout(5000),
    });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: res.ok ? "SENT" : "FAILED",
        httpStatus: res.status,
        attempts: { increment: 1 },
        sentAt: res.ok ? new Date() : null,
      },
    });
  } catch (e: any) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error: String(e.message), attempts: { increment: 1 } },
    });
  }
}