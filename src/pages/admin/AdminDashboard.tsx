import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

const baseTiles = [
  {
    to: '/admin/reuniones',
    title: 'Reuniones',
    icon: '📋',
    desc: 'Crear reuniones por club con sus carreras y caballos.',
  },
  {
    to: '/admin/resultados',
    title: 'Resultados',
    icon: '🏆',
    desc: 'Ingresar 1°/2°/3° y dividendo por carrera.',
  },
  {
    to: '/admin/programas',
    title: 'Programas',
    icon: '💳',
    desc: 'Registro manual de programas (pagos) por reunión.',
  },
  {
    to: '/admin/caballos',
    title: 'Caballos',
    icon: '🐴',
    desc: 'Configurar la cantidad de caballos de cada carrera.',
  },
  {
    to: '/admin/usuarios',
    title: 'Mis usuarios',
    icon: '👥',
    desc: 'Crear y gestionar los usuarios de tu tenant.',
  },
];

const superTile = {
  to: '/admin/admins',
  title: 'Administradores',
  icon: '👑',
  desc: 'Crear y gestionar admins (cada uno es un tenant independiente).',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const tiles = user?.role === 'SUPERADMIN' ? [superTile, ...baseTiles] : baseTiles;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">
        Panel de administración
        {user?.role === 'SUPERADMIN' && (
          <span className="ml-3 chip bg-amber-100 text-amber-700 align-middle">SUPERADMIN</span>
        )}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="card-hover p-5 block">
            <div className="text-4xl">{t.icon}</div>
            <h2 className="font-bold mt-2">{t.title}</h2>
            <p className="text-sm text-slate-600">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
