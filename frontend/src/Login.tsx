import { useState } from "react";
import { api } from "./api";

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("teste@monitor.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.token);
    } catch {
      setError("E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-slate-900 rounded-xl p-6 space-y-4 border border-slate-700">
        <h1 className="text-2xl font-bold">Monitor de Alertas</h1>

        <div>
          <label htmlFor="email" className="block text-sm mb-1">E-mail</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-11 rounded-lg bg-slate-800 border border-slate-600 px-3" />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm mb-1">Senha</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-11 rounded-lg bg-slate-800 border border-slate-600 px-3" />
        </div>

        {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full min-h-11 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-white disabled:opacity-60">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}