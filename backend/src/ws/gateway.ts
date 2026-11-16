import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type Client = WebSocket & { isAlive?: boolean };

let wss: WebSocketServer;

export function initGateway(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: Client, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token") ?? "";
    try {
      jwt.verify(token, env.JWT_SECRET);
    } catch {
      ws.close(4401, "Token inválido");
      return;
    }
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));
    ws.on("message", (raw) => {
      try {
        if (JSON.parse(raw.toString()).type === "ping") ws.send(JSON.stringify({ type: "pong" }));
        } catch { /* ignora mensagens inválidas */ }
    });
    ws.send(JSON.stringify({ type: "hello" }));
  });

  // Heartbeat: a cada 30s derruba quem não respondeu o ping anterior
  setInterval(() => {
    wss.clients.forEach((c) => {
      const client = c as Client;
      if (client.isAlive === false) return client.terminate();
      client.isAlive = false;
      client.ping();
    });
  }, 30000);
}

export function broadcast(message: unknown) {
  if (!wss) return;
  const data = JSON.stringify(message);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  });
}