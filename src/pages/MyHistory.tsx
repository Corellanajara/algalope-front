import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/utils';

interface HistoryItem {
  race: {
    id: number;
    raceNumber: number;
    result: any;
    horses: { id: number; name: string; number: number }[];
    reunion: {
      id: number;
      name: string;
      reunionDate: string;
      racetrack: { name: string };
      week: { year: number; weekNumber: number };
    };
  };
  pick: { id: number; horse: { id: number; name: string; number: number } };
  score: { points: number; breakdown: string } | null;
}

export default function MyHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['history', 'me'],
    queryFn: async () =>
      (await api.get<{ totalPoints: number; items: HistoryItem[] }>('/users/me/history')).data,
  });

  if (isLoading) return <p>Cargando...</p>;
  if (!data) return null;

  // Group by reunion
  const groupedByReunion = new Map<number, { reunion: any; items: HistoryItem[] }>();
  for (const it of data.items) {
    const rid = it.race.reunion.id;
    if (!groupedByReunion.has(rid)) {
      groupedByReunion.set(rid, { reunion: it.race.reunion, items: [] });
    }
    groupedByReunion.get(rid)!.items.push(it);
  }
  const groups = Array.from(groupedByReunion.values()).sort(
    (a, b) =>
      new Date(b.reunion.reunionDate).getTime() - new Date(a.reunion.reunionDate).getTime(),
  );

  const settled = data.items.filter((i) => i.score).length;
  const wins = data.items.filter((i) => {
    const r = i.race.result;
    return r && i.pick.horse.id === r.firstHorseId;
  }).length;
  const podiums = data.items.filter((i) => {
    const r = i.race.result;
    if (!r) return false;
    return [r.firstHorseId, r.secondHorseId, r.thirdHorseId].includes(i.pick.horse.id);
  }).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-4 -top-4 text-[140px] opacity-10 select-none">🏆</div>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold">Mi historial</h1>
            <p className="text-white/80 mt-1">Cartillas jugadas y puntos acumulados</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-white/80">Puntos totales</p>
            <p className="text-5xl font-extrabold tabular-nums">{data.totalPoints}</p>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3 max-w-md">
          <MiniStat label="Resueltas" value={settled} />
          <MiniStat label="Victorias 🥇" value={wins} />
          <MiniStat label="Podios" value={podiums} />
        </div>
      </section>

      {groups.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-3">📋</div>
          <p className="text-slate-600">Aún no has jugado cartillas. ¡Ve al dashboard!</p>
        </div>
      )}

      {groups.map(({ reunion, items }) => {
        const sum = items.reduce((a, x) => a + (x.score?.points || 0), 0);
        items.sort((a, b) => a.race.raceNumber - b.race.raceNumber);
        return (
          <div key={reunion.id} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-2">
              <div>
                <p className="text-xs uppercase font-bold text-brand-600 tracking-wider">
                  🏟️ {reunion.racetrack.name}
                </p>
                <h2 className="font-bold text-lg">{reunion.name}</h2>
                <p className="text-xs text-slate-500">{formatDateTime(reunion.reunionDate)}</p>
              </div>
              <span className="chip bg-brand-100 text-brand-700 text-sm">+{sum} pts</span>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <HistoryRow key={it.race.id} item={it} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2">
      <p className="text-xs text-white/80">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function HistoryRow({ item: it }: { item: HistoryItem }) {
  const breakdown = it.score?.breakdown ? (JSON.parse(it.score.breakdown) as string[]) : [];
  const res = it.race.result;
  const horseMap = new Map(it.race.horses.map((h) => [h.id, h]));
  const pts = it.score?.points ?? null;
  const won = res && it.pick.horse.id === res.firstHorseId;

  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition">
      <div
        className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 font-extrabold text-white ${
          won
            ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
            : pts && pts > 0
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            : pts === 0
            ? 'bg-slate-300 text-slate-600'
            : 'bg-slate-200 text-slate-500'
        }`}
      >
        <span className="text-xs uppercase opacity-80">pts</span>
        <span className="text-lg leading-none">{pts ?? '—'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">Carrera {it.race.raceNumber}</p>
        <p className="font-semibold">
          Tu pick: #{it.pick.horse.number} {it.pick.horse.name}
        </p>
        {res ? (
          <p className="text-xs text-slate-600 mt-1">
            🥇 {horseMap.get(res.firstHorseId)?.name} · 🥈 {horseMap.get(res.secondHorseId)?.name} ·
            🥉 {horseMap.get(res.thirdHorseId)?.name}
            {res.winnerDividend ? ` · ${res.winnerDividend}x` : ''}
          </p>
        ) : (
          <p className="text-xs text-amber-700 mt-1">⏳ Pendiente de resultado</p>
        )}
        {breakdown.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {breakdown.map((b, i) => (
              <span key={i} className="chip bg-slate-100 text-slate-600">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
