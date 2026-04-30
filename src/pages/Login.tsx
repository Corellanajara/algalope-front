import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      nav('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function fill(mail: string, pw: string) {
    setEmail(mail);
    setPassword(pw);
  }

  async function quickLogin(mail: string, pw: string) {
    setError(null);
    setEmail(mail);
    setPassword(pw);
    setLoading(true);
    try {
      await login(mail, pw);
      nav('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  const quickAccounts = [
    { icon: '👤', label: 'Demo', email: 'demo@algalope.cl', password: 'demo123' },
    { icon: '⚙️', label: 'Admin', email: 'admin@algalope.cl', password: 'admin123' },
    { icon: '🥊', label: 'Rival', email: 'rival@algalope.cl', password: 'rival123' },
    { icon: '🏇', label: 'Jorge', email: 'jorge@algalope.cl', password: 'jorge123' },
    { icon: '🏇', label: 'María', email: 'maria@algalope.cl', password: 'maria123' },
    { icon: '🏇', label: 'Pedro', email: 'pedro@algalope.cl', password: 'pedro123' },
    { icon: '🏇', label: 'Ana', email: 'ana@algalope.cl', password: 'ana123' },
    { icon: '🏇', label: 'Luis', email: 'luis@algalope.cl', password: 'luis123' },
  ];

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-turf-800 via-turf-700 to-brand-700 p-4 relative overflow-hidden">
      <div className="absolute inset-0 text-white/5 grid place-items-center pointer-events-none">
        <div className="text-[400px] leading-none select-none">🏇</div>
      </div>
      <form onSubmit={handleSubmit} className="card w-full max-w-md p-8 space-y-5 relative">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-3xl shadow-lg shadow-brand-600/30">
            🏇
          </div>
          <h1 className="text-3xl font-extrabold mt-3">Algalope</h1>
          <p className="text-slate-500 text-sm">Pronósticos hípicos con puntos</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Entrando...' : 'Entrar →'}
        </button>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-xs text-slate-500 text-center font-medium">
            Login rápido (clic para entrar)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickAccounts.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => quickLogin(a.email, a.password)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  fill(a.email, a.password);
                }}
                disabled={loading}
                className="text-xs bg-slate-100 hover:bg-brand-100 rounded-lg p-2 text-left transition disabled:opacity-50"
                title="Clic = entrar · Clic derecho = autocompletar"
              >
                <span className="block font-semibold">
                  {a.icon} {a.label}
                </span>
                <span className="block text-slate-500 truncate">{a.email}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-center text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
