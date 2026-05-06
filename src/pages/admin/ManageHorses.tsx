import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { Reunion, Race, Horse } from '../../lib/types';
import { formatDateTime } from '../../lib/utils';

export default function ManageHorses() {
  const allReunionesQ = useQuery({
    queryKey: ['reuniones', 'all-for-horses'],
    queryFn: async () => (await api.get<Reunion[]>('/reuniones')).data,
  });
  const [reunionId, setReunionId] = useState<number | null>(null);
  const currentReunionId = reunionId ?? allReunionesQ.data?.[0]?.id ?? null;

  const reunionQ = useQuery({
    queryKey: ['reuniones', 'byId', 'horses', currentReunionId],
    queryFn: async () =>
      currentReunionId
        ? (await api.get<Reunion>(`/reuniones/${currentReunionId}`)).data
        : null,
    enabled: !!currentReunionId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Caballos por carrera</h1>
        <p className="text-slate-600">
          Configurá la cantidad de caballos de cada carrera de una reunión existente.
        </p>
      </div>

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

      <div className="space-y-4">
        {reunionQ.data?.races?.map((rc) => (
          <RaceHorseEditor key={rc.id} race={rc} />
        ))}
        {reunionQ.data && (reunionQ.data.races?.length ?? 0) === 0 && (
          <p className="text-slate-500 text-sm">Esta reunión no tiene carreras.</p>
        )}
      </div>
    </div>
  );
}

function RaceHorseEditor({ race }: { race: Race }) {
  const qc = useQueryClient();
  const horses = race.horses ?? [];
  const [draft, setDraft] = useState<number>(horses.length);

  const mut = useMutation({
    mutationFn: async (count: number) =>
      (await api.patch<Horse[]>(`/races/${race.id}/horse-count`, { count })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reuniones'] });
    },
  });

  const dirty = draft !== horses.length;

  return (
    <div className="card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Carrera {race.raceNumber}</h2>
          <p className="text-xs text-slate-500">
            Actual: {horses.length} caballo{horses.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="label text-xs mb-0">Cantidad</label>
          <input
            type="number"
            min={2}
            max={30}
            className="input w-24"
            value={draft}
            onChange={(e) => setDraft(Number(e.target.value))}
          />
          <button
            className="btn-primary text-sm"
            disabled={!dirty || mut.isPending || draft < 2 || draft > 30}
            onClick={() => mut.mutate(draft)}
          >
            {mut.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1 text-xs">
        {horses.map((h) => (
          <div
            key={h.id}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
              h.isScratched
                ? 'bg-slate-100 border-slate-200 line-through text-slate-500'
                : 'bg-white border-slate-200'
            }`}
          >
            <span className="text-slate-500 tabular-nums">#{h.number}</span>
            <span className="truncate">{h.name}</span>
            {h.isFavorite && <span title="Favorito">⭐</span>}
          </div>
        ))}
      </div>

      {mut.isError && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          ⚠️ {(mut.error as any)?.response?.data?.error || 'No se pudo actualizar'}
        </p>
      )}
      {mut.isSuccess && !dirty && (
        <p className="text-xs text-emerald-700">✓ Cantidad actualizada</p>
      )}
    </div>
  );
}
