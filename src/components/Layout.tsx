import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function Layout() {
  const { user, logout, setUser } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

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

  const drawerLinkCls = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-lg font-semibold transition ${
      isActive
        ? 'bg-turf-700 text-white'
        : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-turf-800 via-turf-700 to-turf-800 text-white shadow-lg sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            className="md:hidden text-white/90 hover:text-white p-1 -ml-1"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🏇</span>
            <span className="text-xl font-extrabold tracking-wide">Algalope</span>
          </Link>
          <nav className="hidden md:flex gap-1 ml-4 overflow-x-auto">
            <NavLink to="/" end className={linkCls}>Carreras</NavLink>
            <NavLink to="/historial" className={linkCls}>Mi historial</NavLink>
            <NavLink to="/ranking" className={linkCls}>Ranking</NavLink>
            {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
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
                  {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
                    <span
                      className={`chip text-white text-[10px] ${
                        user.role === 'SUPERADMIN' ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                    >
                      {user.role}
                    </span>
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
                  className="hidden sm:inline-flex bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-medium transition"
                >
                  Salir
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-xl flex flex-col animate-[slideIn_0.18s_ease-out]">
            <div className="bg-gradient-to-r from-turf-800 to-turf-700 text-white p-4 flex items-center justify-between">
              <span className="flex items-center gap-2 font-extrabold tracking-wide">
                <span className="text-2xl">🏇</span> Algalope
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="text-white/80 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            {user && (
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold text-white">
                  {(user.pseudonym || user.displayName).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{user.pseudonym || user.displayName}</p>
                  {user.pseudonym && (
                    <p className="text-xs text-slate-500 truncate">{user.displayName}</p>
                  )}
                  {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
                    <span
                      className={`chip text-white text-[10px] mt-1 ${
                        user.role === 'SUPERADMIN' ? 'bg-amber-500' : 'bg-brand-500'
                      }`}
                    >
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            )}
            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              <NavLink to="/" end className={drawerLinkCls}>🏁 Carreras</NavLink>
              <NavLink to="/historial" className={drawerLinkCls}>📋 Mi historial</NavLink>
              <NavLink to="/ranking" className={drawerLinkCls}>🏆 Ranking</NavLink>
              {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                <NavLink to="/admin" className={drawerLinkCls}>⚙️ Admin</NavLink>
              )}
              {user && (
                <>
                  <div className="h-px bg-slate-100 my-2" />
                  <button
                    onClick={changeNickname}
                    className="w-full text-left px-4 py-3 rounded-lg font-medium text-slate-700 hover:bg-slate-100"
                  >
                    ✏️ Cambiar apodo
                  </button>
                  <button
                    onClick={changePseudonym}
                    className="w-full text-left px-4 py-3 rounded-lg font-medium text-slate-700 hover:bg-slate-100"
                  >
                    🎭 {user.pseudonym ? 'Cambiar seudónimo' : 'Definir seudónimo'}
                  </button>
                </>
              )}
            </nav>
            {user && (
              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    logout();
                    nav('/login');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-semibold transition"
                >
                  Salir
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-slate-500 py-6">
        🏇 Algalope — Pronósticos hípicos con puntos virtuales
      </footer>
    </div>
  );
}
