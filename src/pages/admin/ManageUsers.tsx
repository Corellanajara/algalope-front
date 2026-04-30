import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

export default function ManageUsers() {
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<AdminUser[]>('/users')).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-sm">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Registrado</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3">{u.id}</td>
                <td className="p-3 font-medium">{u.displayName}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <span
                    className={`chip ${
                      u.role === 'ADMIN'
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-sm text-slate-600">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
