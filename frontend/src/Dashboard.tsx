import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useAlertSocket } from "./hooks/useAlertSocket";
import type { EventItem, FeedItem, Metrics, Severity } from "./types";

const SEV: Record<Severity, { label: string; icon: string; badge: string }> = {
  INFO: { label: "Info", icon: "ℹ️", badge: "bg-sky-800 text-white" },
  WARNING: { label: "Atenção", icon: "⚠️", badge: "bg-amber-300 text-black" },
  CRITICAL: { label: "Crítico", icon: "🚨", badge: "bg-red-700 text-white" },
};

const STATUS_UI = {
  connecting: { text: "Conectando...", dot: "bg-slate-400" },
  online: { text: "Conectado", dot: "bg-green-400" },
  reconnecting: { text: "Reconectando...", dot: "bg-amber-400 animate-pulse" },
};

type Toast = { id: string; event: EventItem };

export default function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refresh = useCallback(() => {
    api<Metrics>("/metrics").then(setMetrics).catch(console.error);
    api<EventItem[]>("/events")
      .then((list) =>
        setFeed((prev) => {
          const lat = new Map(prev.map((p) => [p.id, p.latencyMs]));
          return list.map((e) => ({ ...e, latencyMs: lat.get(e.id) }));
        })
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEvent = useCallback(
    (event: EventItem, latencyMs: number) => {
      setFeed((prev) => [{ ...event, latencyMs }, ...prev.filter((e) => e.id !== event.id)].slice(0, 50));
      setToasts((prev) => [...prev, { id: event.id, event }]);
      window.setTimeout(() => setToasts((p) => p.filter((t) => t.id !== event.id)), 7000);
      window.setTimeout(refresh, 1500); // atualiza métricas e status do push
    },
    [refresh]
  );

  const status = useAlertSocket(token, handleEvent, onLogout);

  const avgLatency = useMemo(() => {
    const live = feed.filter((e) => e.latencyMs !== undefined);
    if (!live.length) return null;
    return Math.round(live.reduce((s, e) => s + (e.latencyMs ?? 0), 0) / live.length);
  }, [feed]);

  const cards = [
    { label: "Eventos", value: metrics?.total ?? "-" },
    { label: "Críticos", value: metrics?.critical ?? "-" },
    { label: "Push enviados", value: metrics?.sent ?? "-" },
    { label: "Push com falha", value: metrics?.failed ?? "-" },
    { label: "Latência média", value: avgLatency === null ? "-" : `${avgLatency} ms` },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Toasts */}
      <div className="fixed inset-x-0 top-0 z-50 p-3 flex flex-col gap-2 pointer-events-none sm:items-end">
        {toasts.map(({ id, event }) => (
          <div key={id} role="alert"
            className={`pointer-events-auto w-full sm:max-w-sm rounded-lg p-3 shadow-lg flex items-start gap-3 ${SEV[event.severity].badge}`}>
            <span aria-hidden="true" className="text-xl">{SEV[event.severity].icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold">{SEV[event.severity].label}: {event.type}</p>
              <p className="text-sm break-words">{event.device.name}</p>
            </div>
            <button aria-label="Fechar alerta" onClick={() => setToasts((p) => p.filter((t) => t.id !== id))}
              className="min-h-11 min-w-11 -m-2 text-lg">✕</button>
          </div>
        ))}
      </div>

      <header className="border-b border-slate-800 p-4">
        <div className="mx-auto max-w-screen-2xl flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold">Monitor de Alertas</h1>
          <div className="flex items-center gap-3">
            <span role="status" className="flex items-center gap-2 text-sm">
              <span className={`h-3 w-3 rounded-full ${STATUS_UI[status].dot}`} aria-hidden="true" />
              {STATUS_UI[status].text}
            </span>
            <button onClick={onLogout} className="min-h-11 px-4 rounded-lg border border-slate-600 hover:bg-slate-800">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl p-4 space-y-6">
        <section aria-label="Métricas" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-sm text-slate-300">{c.label}</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{c.value}</p>
            </div>
          ))}
        </section>

        <section aria-label="Fila de eventos">
          <h2 className="text-lg font-semibold mb-3">Eventos em tempo real</h2>
          {feed.length === 0 && <p className="text-slate-300">Nenhum evento ainda.</p>}
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {feed.map((e) => {
              const push = e.notifications?.[0]?.status;
              return (
                <li key={e.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${SEV[e.severity].badge}`}>
                      <span aria-hidden="true">{SEV[e.severity].icon} </span>{SEV[e.severity].label}
                    </span>
                    <span className="font-semibold break-words">{e.type}</span>
                  </div>
                  <p className="text-sm text-slate-300 mt-2">
                    {e.device.name} · {new Date(e.createdAt).toLocaleTimeString("pt-BR")}
                  </p>
                  <pre className="mt-2 text-xs bg-slate-800 rounded p-2 overflow-x-auto">
                    {JSON.stringify(e.payload)}
                  </pre>
                  <p className="text-sm mt-2 text-slate-200">
                    {e.latencyMs !== undefined && (
                      <span className={e.latencyMs <= 500 ? "text-green-300" : "text-red-300"}>
                        Latência: {e.latencyMs} ms{" "}
                      </span>
                    )}
                    {e.severity === "CRITICAL" && <span>· Push: {push ?? "enviando..."}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}