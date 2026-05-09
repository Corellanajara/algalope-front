import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../lib/auth';

interface AdminRow {
  id: number;
  email: string;
  displayName: string;
  pseudonym: string | null;
  role: 'ADMIN';
  createdAt: string;
  usersCount: number;
}

export default function ManageAdmins() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => (await api.get<AdminRow[]>('/admins')).data,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', displayName: '', pseudonym: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: async (payload: typeof form) =>
      (await api.post<AdminRow>('/admins', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      setShowForm(false);
      setForm({ email: '', displayName: '', pseudonym: '', password: '' });
      setError(null);
    },
    onError: (err: any) => setError(err?.response?.data?.error || 'Error al crear admin'),
  });

  const updateMut = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: number;
      displayName?: string;
      pseudonym?: string | null;
      password?: string;
    }) => (await api.patch<AdminRow>(`/admins/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
    onError: (err: any) => alert(err?.response?.data?.error || 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/admins/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
    onError: (err: any) => alert(err?.response?.data?.error || 'Error al eliminar'),
  });

  function resetPassword(a: AdminRow) {
    const pwd = window.prompt(`Nueva contraseña para ${a.email} (mín. 6):`)?.trim();
    if (!pwd) return;
    if (pwd.length < 6) return alert('La contraseña debe tener al menos 6 caracteres');
    updateMut.mutate({ id: a.id, password: pwd });
  }

  function removeAdmin(a: AdminRow) {
    if (
      !window.confirm(
        `¿Eliminar al admin ${a.displayName}? Se borrarán también sus usuarios, reuniones y programas.`,
      )
    )
      return;
    deleteMut.mutate(a.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Administradores</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo admin'}
        </button>
      </div>

      <p className="text-sm text-slate-600">
        Cada administrador es un tenant independiente con sus propios usuarios, reuniones,
        programas y ranking.
      </p>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const payload = { ...form, pseudonym: form.pseudonym.trim() || undefined };
            createMut.mutate(payload as typeof form);
          }}
          className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div>
            <label className="label">Apodo</label>
            <input
              className="input"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              required
              minLength={2}
              maxLength={50}
            />
          </div>
          <div>
            <label className="label">Pseudónimo (opcional)</label>
            <input
              className="input"
              value={form.pseudonym}
              onChange={(e) => setForm({ ...form, pseudonym: e.target.value })}
              maxLength={50}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Contraseña (mín. 6)</label>
            <input
              type="text"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          {error && (
            <div className="md:col-span-2 bg-red-50 text-red-700 text-sm p-2 rounded">{error}</div>
          )}
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={createMut.isPending} className="btn-primary">
              {createMut.isPending ? 'Creando...' : 'Crear admin'}
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-sm">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Apodo</th>
              <th className="p-3">Email</th>
              <th className="p-3">Usuarios</th>
              <th className="p-3">Creado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="p-3">{a.id}</td>
                <td className="p-3 font-medium">{a.displayName}</td>
                <td className="p-3">{a.email}</td>
                <td className="p-3">{a.usersCount}</td>
                <td className="p-3 text-sm text-slate-600">{formatDate(a.createdAt)}</td>
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    className="text-brand-600 hover:underline text-sm"
                    onClick={() => resetPassword(a)}
                  >
                    Contraseña
                  </button>
                  {a.id !== me?.id && (
                    <button
                      className="text-red-600 hover:underline text-sm"
                      onClick={() => removeAdmin(a)}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
