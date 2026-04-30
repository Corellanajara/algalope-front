import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

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
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="font-medium">{user.displayName}</span>
                  {user.role === 'ADMIN' && (
                    <span className="chip bg-brand-500 text-white text-[10px]">ADMIN</span>
                  )}
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
