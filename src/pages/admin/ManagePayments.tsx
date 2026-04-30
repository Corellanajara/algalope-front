import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { Payment, RaceWeek } from '../../lib/types';

interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

export default function ManagePayments() {
  const qc = useQueryClient();
  const weeksQ = useQuery({
    queryKey: ['weeks'],
    queryFn: async () => (await api.get<RaceWeek[]>('/programs/weeks')).data,
  });
  const usersQ = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<AdminUser[]>('/users')).data,
  });
  const [weekId, setWeekId] = useState<number | null>(null);
  const currentWeek = weekId ?? weeksQ.data?.[0]?.id ?? null;

  const payQ = useQuery({
    queryKey: ['payments', currentWeek],
    queryFn: async () =>
      currentWeek
        ? (await api.get<Payment[]>(`/payments?weekId=${currentWeek}`)).data
        : [],
    enabled: !!currentWeek,
  });

  const mut = useMutation({
    mutationFn: async (args: { userId: number; paid: boolean; note?: string }) =>
      (await api.put(`/payments/${args.userId}/${currentWeek}`, {
        paid: args.paid,
        note: args.note ?? null,
      })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });

  const payByUser = new Map((payQ.data ?? []).map((p) => [p.userId, p]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pagos de inscripción</h1>
      <div className="card p-5">
        <label className="label">Semana</label>
        <select
          className="input max-w-xs"
          value={currentWeek ?? ''}
          onChange={(e) => setWeekId(Number(e.target.value))}
        >
          {weeksQ.data?.map((w) => (
            <option key={w.id} value={w.id}>
              Semana {w.weekNumber} / {w.year}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-sm">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3 w-32">Estado</th>
              <th className="p-3">Nota</th>
              <th className="p-3 w-40">Acción</th>
            </tr>
          </thead>
          <tbody>
            {usersQ.data?.map((u) => {
              const p = payByUser.get(u.id);
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <div className="font-medium">{u.displayName}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`chip ${
                        p?.paid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p?.paid ? '✓ Pagado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="p-3">
                    <input
                      className="input"
                      defaultValue={p?.note ?? ''}
                      placeholder="Nota opcional"
                      onBlur={(e) =>
                        mut.mutate({
                          userId: u.id,
                          paid: p?.paid ?? false,
                          note: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="p-3">
                    <button
                      className={p?.paid ? 'btn-ghost text-sm' : 'btn-primary text-sm'}
                      onClick={() =>
                        mut.mutate({
                          userId: u.id,
                          paid: !p?.paid,
                          note: p?.note ?? undefined,
                        })
                      }
                    >
                      {p?.paid ? 'Marcar no pagado' : 'Marcar pagado'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
