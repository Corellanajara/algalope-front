import { Link } from 'react-router-dom';

const tiles = [
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
    desc: 'Registro manual de programas (pagos) por semana.',
  },
  {
    to: '/admin/usuarios',
    title: 'Usuarios',
    icon: '👥',
    desc: 'Ver usuarios registrados.',
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Panel de administración</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="card-hover p-5 block"
          >
            <div className="text-4xl">{t.icon}</div>
            <h2 className="font-bold mt-2">{t.title}</h2>
            <p className="text-sm text-slate-600">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
