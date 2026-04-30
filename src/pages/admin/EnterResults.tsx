import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { Program, Race, RaceWeek } from '../../lib/types';
import { formatDateTime } from '../../lib/utils';

export default function EnterResults() {
  const weeksQ = useQuery({
    queryKey: ['weeks'],
    queryFn: async () => (await api.get<RaceWeek[]>('/programs/weeks')).data,
  });
  const [weekId, setWeekId] = useState<number | null>(null);
  const currentWeek = weekId ?? weeksQ.data?.[0]?.id ?? null;

  const progsQ = useQuery({
    queryKey: ['programs', 'byWeek', currentWeek],
    queryFn: async () =>
      currentWeek ? (await api.get<Program[]>(`/programs?weekId=${currentWeek}`)).data : [],
    enabled: !!currentWeek,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Ingresar resultados</h1>
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

      <div className="space-y-6">
        {progsQ.data?.map((p) => (
          <div key={p.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-brand-600 tracking-wider">
                  🏟️ {p.racetrack?.name}
                </p>
                <h2 className="font-bold text-lg">{p.name}</h2>
                <p className="text-sm text-slate-500">{formatDateTime(p.programDate)}</p>
              </div>
              <span
                className={`chip ${
                  p.status === 'SETTLED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {p.status}
              </span>
            </div>
            <div className="space-y-3">
              {p.races?.map((r) => (
                <ResultForm key={r.id} race={r} />
              ))}
            </div>
          </div>
        ))}
        {!progsQ.data?.length && (
          <p className="text-slate-500 text-sm">No hay programas en esta semana.</p>
        )}
      </div>
    </div>
  );
}

function ResultForm({ race }: { race: Race }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    firstHorseId: race.result?.firstHorseId ?? 0,
    secondHorseId: race.result?.secondHorseId ?? 0,
    thirdHorseId: race.result?.thirdHorseId ?? 0,
    winnerDividend: race.result?.winnerDividend ?? 0,
  });

  const mut = useMutation({
    mutationFn: async () => {
      // The server requires three valid horse IDs from this race. When the race
      // has fewer than 3 horses, fill missing slots with the highest-place horse
      // already chosen — scoring uses the first matching position so duplicates
      // award no extra points.
      const first = Number(form.firstHorseId);
      const second = Number(form.secondHorseId) || first;
      const third = Number(form.thirdHorseId) || second || first;
      return (
        await api.post(`/results/${race.id}`, {
          firstHorseId: first,
          secondHorseId: second,
          thirdHorseId: third,
          winnerDividend: Number(form.winnerDividend),
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const options = race.horses ?? [];
  const horseCount = options.length;
  const uniqueNeeded = Math.min(3, horseCount);

  const positions: { key: 'firstHorseId' | 'secondHorseId' | 'thirdHorseId'; label: string }[] = [
    { key: 'firstHorseId', label: '1°' },
    { key: 'secondHorseId', label: '2°' },
    { key: 'thirdHorseId', label: '3°' },
  ];

  const reasons: string[] = [];
  const missing = positions
    .slice(0, uniqueNeeded)
    .filter((p) => !form[p.key])
    .map((p) => p.label);
  if (missing.length) reasons.push(`Falta seleccionar ${missing.join(', ')}.`);

  const required = positions
    .slice(0, uniqueNeeded)
    .map((p) => form[p.key])
    .filter(Boolean);
  if (required.length === uniqueNeeded && new Set(required).size !== required.length) {
    reasons.push(
      uniqueNeeded === 3
        ? 'Hay caballos repetidos entre 1°, 2° y 3°.'
        : `Los primeros ${uniqueNeeded} puestos deben ser caballos distintos.`,
    );
  }
  if (Number(form.winnerDividend) <= 0) {
    reasons.push('El dividendo debe ser mayor a 0.');
  }
  const valid = reasons.length === 0;

  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold">Carrera {race.raceNumber}</p>
        {race.result && (
          <span className="chip bg-emerald-100 text-emerald-800">✓ Con resultado</span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['firstHorseId', 'secondHorseId', 'thirdHorseId'] as const).map((f, i) => {
          const optional = i + 1 > uniqueNeeded;
          return (
            <div key={f}>
              <label className="label text-xs">
                {i + 1}°{optional && <span className="text-slate-400"> (opcional)</span>}
              </label>
              <select
                className="input"
                value={(form as any)[f]}
                onChange={(e) => setForm({ ...form, [f]: Number(e.target.value) })}
              >
                <option value={0}>--</option>
                {options.map((h) => (
                  <option key={h.id} value={h.id}>
                    #{h.number} {h.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        <div>
          <label className="label text-xs">Dividendo (x)</label>
          <input
            type="number"
            step="0.1"
            className="input"
            value={form.winnerDividend}
            onChange={(e) => setForm({ ...form, winnerDividend: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          className="btn-primary text-sm"
          disabled={!valid || mut.isPending}
          onClick={() => mut.mutate()}
          title={reasons.join(' ') || undefined}
        >
          {mut.isPending ? 'Guardando...' : race.result ? 'Actualizar' : 'Guardar'}
        </button>
        {mut.isSuccess && (
          <span className="text-emerald-700 text-sm">✓ Resultado guardado</span>
        )}
        {mut.isError && (
          <span className="text-red-700 text-sm">
            {(mut.error as any)?.response?.data?.error || 'error'}
          </span>
        )}
      </div>
      {!valid && (
        <ul className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
          {reasons.map((r) => (
            <li key={r}>⚠️ {r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
