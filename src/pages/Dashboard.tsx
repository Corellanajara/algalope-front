import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { api } from '../lib/api';
import { Reunion, Pick, Racetrack } from '../lib/types';
import Countdown from '../components/Countdown';
import { formatDate, formatDateTime, timeLeftMs } from '../lib/utils';
import { useAuth } from '../lib/auth';

type Filter = 'all' | 'open' | 'pending' | 'settled';

export default function Dashboard() {
  const { user } = useAuth();
  const [racetrackId, setRacetrackId] = useState<number | 'all'>('all');
  const [filter, setFilter] = useState<Filter>('all');

  const reunionesQ = useQuery({
    queryKey: ['reuniones', 'current'],
    queryFn: async () => (await api.get<Reunion[]>('/reuniones?current=1')).data,
  });
  const picksQ = useQuery({
    queryKey: ['picks', 'me'],
    queryFn: async () => (await api.get<Pick[]>('/picks/me')).data,
  });
  const tracksQ = useQuery({
    queryKey: ['racetracks'],
    queryFn: async () => (await api.get<Racetrack[]>('/racetracks')).data,
  });
  const history = useQuery({
    queryKey: ['history', 'me'],
    queryFn: async () =>
      (await api.get<{ totalPoints: number; items: any[] }>('/users/me/history')).data,
  });

  const picksByRace = useMemo(
    () => new Map((picksQ.data ?? []).map((p) => [p.raceId, p])),
    [picksQ.data],
  );

  const reuniones = reunionesQ.data ?? [];
  const enriched = reuniones.map((r) => {
    const total = r.races?.length ?? 0;
    const doneCount = (r.races ?? []).filter((rc) => picksByRace.has(rc.id)).length;
    const expired = timeLeftMs(r.deadline) <= 0 || r.status !== 'OPEN';
    return { r, total, doneCount, expired };
  });

  const filtered = enriched
    .filter(({ r, expired, doneCount, total }) => {
      if (racetrackId !== 'all' && r.racetrackId !== racetrackId) return false;
      if (filter === 'open' && expired) return false;
      if (filter === 'pending' && (expired || doneCount === total)) return false;
      if (filter === 'settled' && r.status !== 'SETTLED') return false;
      return true;
    })
    .sort((a, b) => {
      if (a.expired !== b.expired) return a.expired ? 1 : -1;
      return new Date(a.r.reunionDate).getTime() - new Date(b.r.reunionDate).getTime();
    });

  const openReuniones = enriched.filter((e) => !e.expired).length;
  const pending = enriched.filter((e) => !e.expired && e.doneCount < e.total).length;

  if (reunionesQ.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-6 animate-pulse h-44" />
        ))}
      </div>
    );
  }

  if (reunionesQ.isError) {
    const err = reunionesQ.error as any;
    return (
      <div className="card p-6 border-2 border-red-200 bg-red-50">
        <h2 className="font-bold text-red-800">No se pudieron cargar las reuniones</h2>
        <p className="text-sm text-red-700 mt-1">
          {err?.response?.data?.error || err?.message || 'Error desconocido'}
        </p>
        <p className="text-xs text-red-600 mt-2">
          Verifica que el backend esté corriendo en <code>http://localhost:4000</code> (usa{' '}
          <code>npm run dev</code>).
        </p>
        <button onClick={() => reunionesQ.refetch()} className="btn-primary mt-3 text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-turf-800 via-turf-700 to-turf-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-8 -top-8 text-[180px] opacity-10 select-none">🏇</div>
        <div className="relative">
          <p className="text-white/70 text-sm font-medium">
            ¡Bienvenido, {user?.displayName}!
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">
            Reuniones hípicas
          </h1>
          <p className="text-white/80 mt-2 max-w-lg">
            Cada reunión pertenece a una pista. Debes completar <b>toda la cartilla</b> antes
            del deadline para participar.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="📅" label="Reuniones" value={reuniones.length} tint="slate" />
        <StatCard icon="🟢" label="Abiertas" value={openReuniones} tint="emerald" />
        <StatCard icon="⏳" label="Pendientes" value={pending} tint="amber" />
        <StatCard icon="🏆" label="Puntos totales" value={history.data?.totalPoints ?? 0} tint="brand" />
      </section>

      {/* Filters */}
      <section className="card p-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
          Filtros:
        </span>
        <select
          className="input max-w-[240px] py-2"
          value={racetrackId}
          onChange={(e) => setRacetrackId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">🏟️ Todos los clubes</option>
          {tracksQ.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(
            [
              ['all', 'Todas'],
              ['open', 'Abiertas'],
              ['pending', 'Pendientes'],
              ['settled', 'Finalizadas'],
            ] as [Filter, string][]
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === v ? 'bg-white shadow text-brand-700' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-slate-500">
          {filtered.length} / {reuniones.length} reuni{reuniones.length === 1 ? 'ón' : 'ones'}
        </span>
      </section>

      {/* Reuniones */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-3">🔍</div>
          <h2 className="text-xl font-bold">Sin resultados</h2>
          <p className="text-slate-600 mt-2">
            {reuniones.length === 0
              ? 'Aún no hay reuniones cargadas. Avisa al administrador.'
              : 'No hay reuniones que coincidan con estos filtros.'}
          </p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {filtered.map(({ r, total, doneCount, expired }) => (
            <ReunionCard key={r.id} r={r} total={total} doneCount={doneCount} expired={expired} />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: string;
  label: string;
  value: number;
  tint: 'slate' | 'emerald' | 'amber' | 'brand';
}) {
  const tints: Record<string, string> = {
    slate: 'from-slate-500/10 to-slate-500/0 text-slate-700',
    emerald: 'from-emerald-500/15 to-emerald-500/0 text-emerald-700',
    amber: 'from-amber-500/15 to-amber-500/0 text-amber-700',
    brand: 'from-brand-500/15 to-brand-500/0 text-brand-700',
  };
  return (
    <div className={`card p-4 bg-gradient-to-br ${tints[tint]}`}>
      <div className="text-2xl">{icon}</div>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function ReunionCard({
  r,
  total,
  doneCount,
  expired,
}: {
  r: Reunion;
  total: number;
  doneCount: number;
  expired: boolean;
}) {
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const settled = r.status === 'SETTLED';
  const complete = doneCount === total && total > 0;

  return (
    <Link to={`/reunion/${r.id}`} className="card-hover p-5 block group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
            🏟️ {r.racetrack?.name}
          </p>
          <h3 className="font-bold text-lg mt-0.5 truncate">{r.name}</h3>
          <p className="text-sm text-slate-500">{formatDate(r.reunionDate)}</p>
        </div>
        <Countdown to={r.deadline} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>
            Cartilla · {total} carrera{total === 1 ? '' : 's'}
          </span>
          <span className="font-bold">
            {doneCount}/{total}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              complete
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : 'bg-gradient-to-r from-brand-500 to-brand-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        ⏰ Cierre: {formatDateTime(r.deadline)}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <span className="chip bg-slate-100 text-slate-700">
          📋 {r.cartillasCount ?? 0} cartilla{(r.cartillasCount ?? 0) === 1 ? '' : 's'} enviada{(r.cartillasCount ?? 0) === 1 ? '' : 's'}
        </span>
        {settled ? (
          <span className="chip bg-slate-200 text-slate-700">✓ Finalizada</span>
        ) : expired ? (
          complete ? (
            <span className="chip bg-emerald-100 text-emerald-800">✓ Cartilla completa</span>
          ) : (
            <span className="chip bg-red-100 text-red-700">Deadline cerrado</span>
          )
        ) : complete ? (
          <span className="chip bg-emerald-100 text-emerald-800">
            ✓ Completa · editar
          </span>
        ) : (
          <span className="chip bg-amber-100 text-amber-800 group-hover:bg-brand-500 group-hover:text-white transition">
            → Jugar cartilla
          </span>
        )}
      </div>
    </Link>
  );
}
