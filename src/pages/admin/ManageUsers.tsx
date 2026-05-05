import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../lib/auth';

interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  pseudonym: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export default function ManageUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<AdminUser[]>('/users')).data,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', displayName: '', pseudonym: '', password: '', role: 'USER' as 'USER' | 'ADMIN' });
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: async (payload: typeof form) => (await api.post<AdminUser>('/users', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setForm({ email: '', displayName: '', pseudonym: '', password: '', role: 'USER' });
      setError(null);
    },
    onError: (err: any) => setError(err?.response?.data?.error || 'Error al crear usuario'),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; displayName?: string; pseudonym?: string | null; role?: 'USER' | 'ADMIN'; password?: string }) =>
      (await api.patch<AdminUser>(`/users/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => alert(err?.response?.data?.error || 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => alert(err?.response?.data?.error || 'Error al eliminar'),
  });

  function editNickname(u: AdminUser) {
    const next = window.prompt(`Nuevo apodo para ${u.email}:`, u.displayName)?.trim();
    if (!next || next === u.displayName) return;
    updateMut.mutate({ id: u.id, displayName: next });
  }

  function editPseudonym(u: AdminUser) {
    const raw = window.prompt(
      `Pseudónimo (nickname) para ${u.email} — vacío para quitar:`,
      u.pseudonym ?? '',
    );
    if (raw === null) return;
    const trimmed = raw.trim();
    updateMut.mutate({ id: u.id, pseudonym: trimmed === '' ? null : trimmed });
  }

  function resetPassword(u: AdminUser) {
    const pwd = window.prompt(`Nueva contraseña para ${u.email} (mín. 6):`)?.trim();
    if (!pwd) return;
    if (pwd.length < 6) return alert('La contraseña debe tener al menos 6 caracteres');
    updateMut.mutate({ id: u.id, password: pwd });
  }

  function toggleRole(u: AdminUser) {
    const next = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`¿Cambiar rol de ${u.displayName} a ${next}?`)) return;
    updateMut.mutate({ id: u.id, role: next });
  }

  function removeUser(u: AdminUser) {
    if (!window.confirm(`¿Eliminar usuario ${u.displayName} (${u.email})? Esto borra sus apuestas.`)) return;
    deleteMut.mutate(u.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

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
            <label className="label">Apodo (sin información personal)</label>
            <input
              className="input"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              required
              minLength={2}
              maxLength={50}
              placeholder="ej. JineteRojo"
            />
          </div>
          <div>
            <label className="label">Pseudónimo (opcional)</label>
            <input
              className="input"
              value={form.pseudonym}
              onChange={(e) => setForm({ ...form, pseudonym: e.target.value })}
              maxLength={50}
              placeholder="ej. Bless"
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
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'USER' | 'ADMIN' })}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          {error && <div className="md:col-span-2 bg-red-50 text-red-700 text-sm p-2 rounded">{error}</div>}
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={createMut.isPending} className="btn-primary">
              {createMut.isPending ? 'Creando...' : 'Crear usuario'}
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
              <th className="p-3">Pseudónimo</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Registrado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3">{u.id}</td>
                <td className="p-3 font-medium">{u.displayName}</td>
                <td className="p-3 text-sm">
                  {u.pseudonym ?? <span className="text-slate-400">—</span>}
                </td>
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
                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                  <button className="text-brand-600 hover:underline text-sm" onClick={() => editNickname(u)}>
                    Apodo
                  </button>
                  <button className="text-brand-600 hover:underline text-sm" onClick={() => editPseudonym(u)}>
                    Pseudónimo
                  </button>
                  <button className="text-brand-600 hover:underline text-sm" onClick={() => resetPassword(u)}>
                    Contraseña
                  </button>
                  {u.id !== me?.id && (
                    <>
                      <button className="text-brand-600 hover:underline text-sm" onClick={() => toggleRole(u)}>
                        {u.role === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button className="text-red-600 hover:underline text-sm" onClick={() => removeUser(u)}>
                        Eliminar
                      </button>
                    </>
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
