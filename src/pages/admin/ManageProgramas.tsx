import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { api } from '../../lib/api';
import { Programa, Reunion } from '../../lib/types';
import { formatDateTime } from '../../lib/utils';

interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

export default function ManageProgramas() {
  const qc = useQueryClient();

  const reunionesQ = useQuery({
    queryKey: ['reuniones', 'all-for-programas'],
    queryFn: async () => (await api.get<Reunion[]>('/reuniones')).data,
  });
  const [reunionId, setReunionId] = useState<number | null>(null);
  const currentReunionId = reunionId ?? reunionesQ.data?.[0]?.id ?? null;
  const currentReunion = reunionesQ.data?.find((r) => r.id === currentReunionId);
  const currentWeek = currentReunion?.weekId ?? null;

  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<AdminUser[]>('/users')).data,
  });
  const programasQ = useQuery({
    queryKey: ['programas', currentWeek],
    queryFn: async () =>
      currentWeek
        ? (await api.get<Programa[]>(`/programas?weekId=${currentWeek}`)).data
        : [],
    enabled: !!currentWeek,
  });

  const upsertMut = useMutation({
    mutationFn: async (body: { userId: number; weekId: number; paid: boolean; note?: string | null }) =>
      (await api.post('/programas', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programas'] }),
  });
  const updateMut = useMutation({
    mutationFn: async ({ id, paid, note }: { id: number; paid?: boolean; note?: string | null }) =>
      (await api.patch(`/programas/${id}`, { paid, note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programas'] }),
  });

  const programaByUser = useMemo(
    () => new Map((programasQ.data ?? []).map((p) => [p.userId, p])),
    [programasQ.data],
  );

  const totalPaid = (programasQ.data ?? []).filter((p) => p.paid).length;
  const totalUsers = (usersQ.data ?? []).filter((u) => u.role !== 'ADMIN').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Programas</h1>
        <p className="text-slate-600">
          Registro manual de programas (pagos) por reunión y usuario.
        </p>
      </div>

      <div className="card p-5 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Reunión</label>
          <select
            className="input min-w-[280px]"
            value={currentReunionId ?? ''}
            onChange={(e) => setReunionId(Number(e.target.value))}
          >
            {reunionesQ.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.racetrack?.name ? `${r.racetrack.name} · ` : ''}
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {currentReunion && (
          <p className="text-xs text-slate-500">
            Fecha: {formatDateTime(currentReunion.reunionDate)}
          </p>
        )}
        <div className="ml-auto flex gap-3 text-sm">
          <span className="chip bg-emerald-100 text-emerald-800">
            ✓ {totalPaid} pagados
          </span>
          <span className="chip bg-slate-100 text-slate-700">
            👤 {totalUsers} usuarios
          </span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4">Usuario</th>
              <th className="p-4 w-32">Estado</th>
              <th className="p-4 w-44">Pagado el</th>
              <th className="p-4">Nota</th>
              <th className="p-4 w-32 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {(usersQ.data ?? [])
              .filter((u) => u.role !== 'ADMIN')
              .map((u) => {
                const p = programaByUser.get(u.id);
                return (
                  <UserRow
                    key={u.id}
                    user={u}
                    programa={p}
                    weekId={currentWeek!}
                    onTogglePay={(paid) => {
                      if (p) updateMut.mutate({ id: p.id, paid });
                      else upsertMut.mutate({ userId: u.id, weekId: currentWeek!, paid });
                    }}
                    onSaveNote={(note) => {
                      if (p) updateMut.mutate({ id: p.id, note });
                      else upsertMut.mutate({ userId: u.id, weekId: currentWeek!, paid: false, note });
                    }}
                  />
                );
              })}
            {!usersQ.isLoading && (usersQ.data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({
  user,
  programa,
  onTogglePay,
  onSaveNote,
}: {
  user: AdminUser;
  programa?: Programa;
  weekId: number;
  onTogglePay: (paid: boolean) => void;
  onSaveNote: (note: string | null) => void;
}) {
  const [note, setNote] = useState(programa?.note ?? '');
  const [editing, setEditing] = useState(false);

  return (
    <tr className="border-t border-slate-100">
      <td className="p-4">
        <div className="font-semibold">{user.displayName}</div>
        <div className="text-xs text-slate-500">{user.email}</div>
      </td>
      <td className="p-4">
        <span
          className={`chip ${
            programa?.paid
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {programa?.paid ? '✓ Pagado' : '⏳ Pendiente'}
        </span>
      </td>
      <td className="p-4 text-sm text-slate-600">
        {programa?.paidAt ? formatDateTime(programa.paidAt) : '—'}
      </td>
      <td className="p-4">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota (opcional)"
            />
            <button
              className="btn-primary text-xs"
              onClick={() => {
                onSaveNote(note.trim() || null);
                setEditing(false);
              }}
            >
              Guardar
            </button>
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                setNote(programa?.note ?? '');
                setEditing(false);
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 truncate">
              {programa?.note || <span className="text-slate-400">—</span>}
            </span>
            <button
              className="text-xs text-brand-600 hover:underline"
              onClick={() => setEditing(true)}
            >
              Editar
            </button>
          </div>
        )}
      </td>
      <td className="p-4 text-right">
        <button
          className={programa?.paid ? 'btn-ghost text-sm' : 'btn-primary text-sm'}
          onClick={() => onTogglePay(!programa?.paid)}
        >
          {programa?.paid ? 'Marcar pendiente' : 'Marcar pagado'}
        </button>
      </td>
    </tr>
  );
}
