const API = process.env.API_URL ?? "http://localhost:3000";

const devices = (await (await fetch(`${API}/devices`)).json()) as { id: string; name: string }[];
const types = ["cpu_alta", "memoria_alta", "servidor_fora", "temperatura_alta", "disco_cheio"];

function pickSeverity() {
  const r = Math.random();
  return r < 0.6 ? "INFO" : r < 0.85 ? "WARNING" : "CRITICAL";
}

async function send() {
  const device = devices[Math.floor(Math.random() * devices.length)];
  const body = {
    type: types[Math.floor(Math.random() * types.length)],
    severity: pickSeverity(),
    deviceId: device.id,
    payload: { valor: Math.round(Math.random() * 100) },
  };
  const res = await fetch(`${API}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(res.status, body.severity, body.type, device.name);
}

console.log("Simulador iniciado (Ctrl+C para parar)");
setInterval(send, 4000);