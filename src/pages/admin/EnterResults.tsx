import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { Reunion, Race } from '../../lib/types';
import { formatDateTime } from '../../lib/utils';

export default function EnterResults() {
  const allReunionesQ = useQuery({
    queryKey: ['reuniones', 'all-for-results'],
    queryFn: async () => (await api.get<Reunion[]>('/reuniones')).data,
  });
  const [reunionId, setReunionId] = useState<number | null>(null);
  const currentReunionId =
    reunionId ?? allReunionesQ.data?.[0]?.id ?? null;

  const reunionesQ = useQuery({
    queryKey: ['reuniones', 'byId', currentReunionId],
    queryFn: async () =>
      currentReunionId
        ? [(await api.get<Reunion>(`/reuniones/${currentReunionId}`)).data]
        : [],
    enabled: !!currentReunionId,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Ingresar resultados</h1>
      <div className="card p-5">
        <label className="label">Reunión</label>
        <select
          className="input max-w-md"
          value={currentReunionId ?? ''}
          onChange={(e) => setReunionId(Number(e.target.value))}
        >
          {allReunionesQ.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.racetrack?.name ? `${r.racetrack.name} · ` : ''}
              {r.name} — {formatDateTime(r.reunionDate)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-6">
        {reunionesQ.data?.map((r) => (
          <div key={r.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-brand-600 tracking-wider">
                  🏟️ {r.racetrack?.name}
                </p>
                <h2 className="font-bold text-lg">{r.name}</h2>
                <p className="text-sm text-slate-500">{formatDateTime(r.reunionDate)}</p>
              </div>
              <span
                className={`chip ${
                  r.status === 'SETTLED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {r.status}
              </span>
            </div>
            <div className="space-y-3">
              {r.races?.map((rc) => (
                <ResultForm key={rc.id} race={rc} />
              ))}
            </div>
          </div>
        ))}
        {!reunionesQ.data?.length && (
          <p className="text-slate-500 text-sm">No hay reuniones disponibles.</p>
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
      qc.invalidateQueries({ queryKey: ['reuniones'] });
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
      <HorsesAdminPanel race={race} />
      <div className="h-px bg-slate-200 my-3" />
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

export function HorsesAdminPanel({ race }: { race: Race }) {
  const qc = useQueryClient();
  const horses = race.horses ?? [];
  const favoriteId = horses.find((h) => h.isFavorite)?.id ?? null;

  const setFavoriteMut = useMutation({
    mutationFn: async (horseId: number) =>
      (await api.post(`/races/${race.id}/favorite`, { horseId })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reuniones'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const scratchMut = useMutation({
    mutationFn: async (vars: { horseId: number; scratched: boolean }) =>
      (await api.post(`/races/horses/${vars.horseId}/scratch`, {
        scratched: vars.scratched,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reuniones'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
        Caballos · favorito y bajas
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {horses.map((h) => (
          <div
            key={h.id}
            className={`flex items-center gap-2 px-2 py-1 rounded-lg ${
              h.isScratched ? 'bg-slate-100' : 'bg-white border border-slate-200'
            }`}
          >
            <span className="w-6 text-xs text-slate-500 tabular-nums">#{h.number}</span>
            <span
              className={`flex-1 text-sm truncate ${
                h.isScratched ? 'line-through text-slate-500' : ''
              }`}
            >
              {h.name}
            </span>
            <label
              className="text-xs flex items-center gap-1 cursor-pointer select-none"
              title="Marcar como favorito (uno por carrera)"
            >
              <input
                type="radio"
                name={`fav-${race.id}`}
                checked={favoriteId === h.id}
                onChange={() => setFavoriteMut.mutate(h.id)}
              />
              ⭐
            </label>
            <label
              className="text-xs flex items-center gap-1 cursor-pointer select-none"
              title="Caballo dado de baja"
            >
              <input
                type="checkbox"
                checked={!!h.isScratched}
                onChange={(e) =>
                  scratchMut.mutate({ horseId: h.id, scratched: e.target.checked })
                }
              />
              🚫
            </label>
          </div>
        ))}
      </div>
      {setFavoriteMut.isError && (
        <p className="text-xs text-red-700 mt-1">
          {(setFavoriteMut.error as any)?.response?.data?.error || 'No se pudo cambiar el favorito'}
        </p>
      )}
      {scratchMut.isError && (
        <p className="text-xs text-red-700 mt-1">
          {(scratchMut.error as any)?.response?.data?.error || 'No se pudo actualizar el caballo'}
        </p>
      )}
    </div>
  );
}
