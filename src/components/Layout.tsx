import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function Layout() {
  const { user, logout, setUser } = useAuth();
  const nav = useNavigate();

  async function changeNickname() {
    if (!user) return;
    const next = window.prompt('Nuevo apodo (sin información personal):', user.displayName)?.trim();
    if (!next || next === user.displayName) return;
    if (next.length < 2 || next.length > 50) {
      alert('El apodo debe tener entre 2 y 50 caracteres');
      return;
    }
    try {
      const { data } = await api.patch('/users/me', { displayName: next });
      const updated = { ...user, displayName: data.displayName, pseudonym: data.pseudonym };
      localStorage.setItem('algalope_user', JSON.stringify(updated));
      setUser(updated);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'No se pudo actualizar el apodo');
    }
  }

  async function changePseudonym() {
    if (!user) return;
    const current = user.pseudonym ?? '';
    const msg = current
      ? `Tu seudónimo actual es: "${current}".\nIngresa el nuevo (vacío para quitarlo):`
      : 'Ingresa un seudónimo (se mostrará en ranking y cartillas):';
    const raw = window.prompt(msg, current);
    if (raw === null) return;
    const next = raw.trim();
    if (next === current) return;
    if (next && (next.length < 2 || next.length > 50)) {
      alert('El seudónimo debe tener entre 2 y 50 caracteres');
      return;
    }
    try {
      const { data } = await api.patch('/users/me', { pseudonym: next || null });
      const updated = { ...user, displayName: data.displayName, pseudonym: data.pseudonym };
      localStorage.setItem('algalope_user', JSON.stringify(updated));
      setUser(updated);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'No se pudo actualizar el seudónimo');
    }
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-semibold transition ${
      isActive
        ? 'bg-white text-turf-800 shadow-sm'
        : 'text-white/80 hover:text-white hover:bg-white/10'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-turf-800 via-turf-700 to-turf-800 text-white shadow-lg sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🏇</span>
            <span className="text-xl font-extrabold tracking-wide">Algalope</span>
          </Link>
          <nav className="flex gap-1 ml-4 overflow-x-auto">
            <NavLink to="/" end className={linkCls}>Carreras</NavLink>
            <NavLink to="/historial" className={linkCls}>Mi historial</NavLink>
            <NavLink to="/ranking" className={linkCls}>Ranking</NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" className={linkCls}>Admin</NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user && (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-full pl-1 pr-3 py-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold text-white text-xs">
                    {(user.pseudonym || user.displayName).slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-medium">{user.pseudonym || user.displayName}</span>
                  {user.pseudonym && (
                    <span
                      className="text-white/60 text-[11px] hidden md:inline"
                      title={`Apodo: ${user.displayName}`}
                    >
                      ({user.displayName})
                    </span>
                  )}
                  {user.role === 'ADMIN' && (
                    <span className="chip bg-brand-500 text-white text-[10px]">ADMIN</span>
                  )}
                  <button
                    onClick={changeNickname}
                    title="Cambiar apodo"
                    className="ml-1 text-white/70 hover:text-white text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={changePseudonym}
                    title={
                      user.pseudonym
                        ? `Cambiar seudónimo (actual: ${user.pseudonym})`
                        : 'Definir seudónimo'
                    }
                    className="text-white/70 hover:text-white text-xs"
                  >
                    🎭
                  </button>
                </div>
                <button
                  onClick={() => {
                    logout();
                    nav('/login');
                  }}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-medium transition"
                >
                  Salir
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-slate-500 py-6">
        🏇 Algalope — Pronósticos hípicos con puntos virtuales
      </footer>
    </div>
  );
}
