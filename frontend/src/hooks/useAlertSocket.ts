import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../config";
import type { EventItem } from "../types";

export type ConnStatus = "connecting" | "online" | "reconnecting";

export function useAlertSocket(
  token: string,
  onEvent: (event: EventItem, latencyMs: number) => void,
  onAuthError: () => void
) {
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const onEventRef = useRef(onEvent);
  const onAuthRef = useRef(onAuthError);

  useEffect(() => {
    onEventRef.current = onEvent;
    onAuthRef.current = onAuthError;
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let attempt = 0;
    let retryTimer: number | undefined;
    let pingTimer: number | undefined;
    let pongTimer: number | undefined;
    let closedByUs = false;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        attempt = 0;
        setStatus("online");
        // Heartbeat: ping a cada 20s; sem pong em 10s, derruba e reconecta
        pingTimer = window.setInterval(() => {
          if (ws?.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "ping" }));
          pongTimer = window.setTimeout(() => ws?.close(), 10000);
        }, 20000);
      };

      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.type === "pong") {
          window.clearTimeout(pongTimer);
        } else if (msg.type === "event") {
          const latency = Date.now() - Date.parse(msg.event.publishedAt);
          onEventRef.current(msg.event as EventItem, latency);
        }
      };

      ws.onclose = (ev) => {
        window.clearInterval(pingTimer);
        window.clearTimeout(pongTimer);
        if (closedByUs) return;
        if (ev.code === 4401) {          // token inválido: volta ao login
          onAuthRef.current();
          return;
        }
        setStatus("reconnecting");
        const delay = Math.min(30000, 1000 * 2 ** attempt++) + Math.random() * 300;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      closedByUs = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      window.clearTimeout(pongTimer);
      ws?.close();
    };
  }, [token]);

  return status;
}