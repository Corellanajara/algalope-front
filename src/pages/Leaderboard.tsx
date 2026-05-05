import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { LeaderEntry, Reunion, RaceWeek } from '../lib/types';
import { useAuth } from '../lib/auth';

export default function Leaderboard() {
  const { user } = useAuth();
  const [weekId, setWeekId] = useState<'all' | number>('all');
  const [reunionId, setReunionId] = useState<'all' | number>('all');

  const weeks = useQuery({
    queryKey: ['weeks'],
    queryFn: async () => (await api.get<RaceWeek[]>('/reuniones/weeks')).data,
  });
  const reunionesQ = useQuery({
    queryKey: ['reuniones', 'all-for-leaderboard'],
    queryFn: async () => (await api.get<Reunion[]>('/reuniones')).data,
  });
  const board = useQuery({
    queryKey: ['leaderboard', weekId, reunionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reunionId !== 'all') params.set('reunionId', String(reunionId));
      else if (weekId !== 'all') params.set('weekId', String(weekId));
      const q = params.toString() ? `?${params}` : '';
      return (await api.get<LeaderEntry[]>(`/leaderboard${q}`)).data;
    },
  });

  const top3 = (board.data ?? []).slice(0, 3);
  const rest = (board.data ?? []).slice(3);

  const subtitle =
    reunionId !== 'all'
      ? `Ranking de la reunión #${reunionId}`
      : weekId === 'all'
      ? 'Acumulado general'
      : 'Ranking de la semana';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">🏆 Ranking</h1>
          <p className="text-slate-600">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="input max-w-xs"
            value={reunionId}
            onChange={(e) =>
              setReunionId(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
          >
            <option value="all">Todas las reuniones</option>
            {reunionesQ.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.racetrack?.name ? `${r.racetrack.name} · ` : ''}
                {r.name}
              </option>
            ))}
          </select>
          <select
            className="input max-w-xs"
            value={weekId}
            disabled={reunionId !== 'all'}
            onChange={(e) => setWeekId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">Acumulado general</option>
            {weeks.data?.map((w) => (
              <option key={w.id} value={w.id}>
                Semana {w.weekNumber} / {w.year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <section className="grid grid-cols-3 gap-3 items-end">
          {top3[1] && <PodiumCard e={top3[1]} place={2} highlight={top3[1].user.id === user?.id} />}
          {top3[0] && <PodiumCard e={top3[0]} place={1} highlight={top3[0].user.id === user?.id} />}
          {top3[2] && <PodiumCard e={top3[2]} place={3} highlight={top3[2].user.id === user?.id} />}
        </section>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 w-14">#</th>
              <th className="p-4">Jugador</th>
              <th className="p-4 w-24 text-right hidden sm:table-cell">Carreras</th>
              <th className="p-4 w-24 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rest.length === 0 && top3.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-500">
                  Sin puntajes todavía — cuando el admin ingrese resultados verás el ranking aquí.
                </td>
              </tr>
            )}
            {rest.map((e) => {
              const name = (e.user.pseudonym && e.user.pseudonym.trim()) || e.user.displayName;
              return (
                <tr
                  key={e.user.id}
                  className={`border-t border-slate-100 ${
                    e.user.id === user?.id ? 'bg-brand-50/50' : ''
                  }`}
                >
                  <td className="p-4 font-bold text-slate-500">{e.rank}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-bold text-white text-sm">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          {name}
                          {e.user.id === user?.id && (
                            <span className="chip bg-brand-100 text-brand-700">Tú</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right hidden sm:table-cell tabular-nums">{e.races}</td>
                  <td className="p-4 text-right font-extrabold text-brand-600 tabular-nums">
                    {e.points}
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

function PodiumCard({
  e,
  place,
  highlight,
}: {
  e: LeaderEntry;
  place: 1 | 2 | 3;
  highlight: boolean;
}) {
  const cfg = {
    1: {
      icon: '🥇',
      grad: 'from-yellow-400 via-amber-400 to-yellow-500',
      h: 'h-44',
      size: 'text-5xl',
    },
    2: {
      icon: '🥈',
      grad: 'from-slate-300 to-slate-400',
      h: 'h-36',
      size: 'text-4xl',
    },
    3: {
      icon: '🥉',
      grad: 'from-orange-500 via-amber-600 to-orange-700',
      h: 'h-32',
      size: 'text-4xl',
    },
  }[place];
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${cfg.grad} text-white p-4 shadow-lg text-center flex flex-col justify-end ${cfg.h} relative ${
        highlight ? 'ring-4 ring-brand-500' : ''
      }`}
    >
      <div className={`${cfg.size} mb-1`}>{cfg.icon}</div>
      <p className="font-bold truncate">{(e.user.pseudonym && e.user.pseudonym.trim()) || e.user.displayName}</p>
      <p className="text-2xl font-extrabold tabular-nums">{e.points}</p>
      <p className="text-[11px] opacity-90 uppercase tracking-wider">puntos</p>
    </div>
  );
}
