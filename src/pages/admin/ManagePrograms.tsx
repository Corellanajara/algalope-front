import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { Program, Racetrack } from '../../lib/types';
import { formatDateTime } from '../../lib/utils';

const ONE_HOUR_MS = 60 * 60 * 1000;

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

interface DraftRace {
  raceNumber: number;
  horseCount: number;
}

export default function ManagePrograms() {
  const qc = useQueryClient();
  const tracksQ = useQuery({
    queryKey: ['racetracks'],
    queryFn: async () => (await api.get<Racetrack[]>('/racetracks')).data,
  });
  const programsQ = useQuery({
    queryKey: ['programs', 'all'],
    queryFn: async () => (await api.get<Program[]>('/programs')).data,
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);

  const delMut = useMutation({
    mutationFn: async (id: number) => api.delete(`/programs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Programas</h1>
          <p className="text-slate-600">Cada programa pertenece a un club con múltiples carreras.</p>
        </div>
        <button onClick={() => setWizardOpen(true)} className="btn-primary">
          + Nuevo programa
        </button>
      </div>

      {wizardOpen && (
        <ProgramWizard
          tracks={tracksQ.data ?? []}
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['programs'] });
            setWizardOpen(false);
          }}
        />
      )}

      {editing && (
        <EditProgramModal
          program={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['programs'] });
            setEditing(null);
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {programsQ.data?.length === 0 && (
          <div className="card p-8 text-center col-span-full">
            <p className="text-slate-600">No hay programas. Crea el primero.</p>
          </div>
        )}
        {programsQ.data?.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase font-bold text-brand-600 tracking-wider">
                  🏟️ {p.racetrack?.name}
                </p>
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-sm text-slate-500">{formatDateTime(p.programDate)}</p>
                <p className="text-xs text-slate-400">⏰ Cierre: {formatDateTime(p.deadline)}</p>
              </div>
              <span
                className={`chip ${
                  p.status === 'SETTLED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : p.status === 'CLOSED'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {p.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {p.races?.length ?? 0} carrera{(p.races?.length ?? 0) === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditing(p)}
                  className="text-brand-600 text-sm hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${p.name}"?`)) delMut.mutate(p.id);
                  }}
                  className="text-red-600 text-sm hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Edit modal ---

function EditProgramModal({
  program,
  onClose,
  onSaved,
}: {
  program: Program;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: program.name,
    programDate: toLocalInput(new Date(program.programDate)),
    status: program.status,
  });

  const updateMut = useMutation({
    mutationFn: async () =>
      (
        await api.put(`/programs/${program.id}`, {
          name: form.name,
          programDate: new Date(form.programDate).toISOString(),
          status: form.status,
        })
      ).data,
    onSuccess: () => onSaved(),
  });

  const nameTrimmed = form.name.trim();
  const programDateValid = !Number.isNaN(new Date(form.programDate).getTime());
  const computedDeadline = programDateValid
    ? new Date(new Date(form.programDate).getTime() - ONE_HOUR_MS)
    : null;

  const reasons: string[] = [];
  if (!nameTrimmed) reasons.push('El nombre no puede estar vacío.');
  if (!programDateValid) reasons.push('La fecha y hora del programa son inválidas.');

  const canSave = reasons.length === 0 && !updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-3 overflow-y-auto">
      <div className="card w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-turf-800 to-turf-700 text-white p-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Editar programa</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">📆 Fecha y hora del programa</label>
            <input
              type="datetime-local"
              className="input"
              value={form.programDate}
              onChange={(e) => setForm({ ...form, programDate: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1">
              ⏰ Cierre automático (1 h antes):{' '}
              <b>{computedDeadline ? formatDateTime(computedDeadline) : '—'}</b>
            </p>
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Program['status'] })}
            >
              <option value="OPEN">OPEN — abierto a selecciones</option>
              <option value="CLOSED">CLOSED — cerrado</option>
              <option value="SETTLED">SETTLED — liquidado</option>
            </select>
          </div>
          {updateMut.isError && (
            <p className="text-red-700 text-sm">
              Error: {(updateMut.error as any)?.response?.data?.error || 'inesperado'}
            </p>
          )}
        </div>
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-2">
          {reasons.length > 0 && (
            <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
              {reasons.map((r) => (
                <li key={r}>⚠️ {r}</li>
              ))}
            </ul>
          )}
          <div className="flex justify-between items-center">
            <button onClick={onClose} className="btn-ghost">
              Cancelar
            </button>
            <button
              onClick={() => updateMut.mutate()}
              disabled={!canSave}
              title={reasons.join(' ') || undefined}
              className="btn-primary"
            >
              {updateMut.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Wizard (simplified) ---

function ProgramWizard({
  tracks,
  onClose,
  onCreated,
}: {
  tracks: Racetrack[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const now = new Date();
  const [meta, setMeta] = useState({
    racetrackId: 0,
    name: 'Reunión',
    programDate: toLocalInput(new Date(now.getTime() + 2 * 86400000)),
  });

  // Start with a sensible default: 1 race, 12 horses each.
  const [raceCount, setRaceCount] = useState(1);
  const [defaultHorses, setDefaultHorses] = useState(12);
  const [races, setRaces] = useState<DraftRace[]>([{ raceNumber: 1, horseCount: 12 }]);

  function applyRaceCount(n: number) {
    const safe = Math.max(1, Math.min(40, n));
    setRaceCount(safe);
    const next: DraftRace[] = [];
    for (let i = 0; i < safe; i++) {
      const existing = races[i];
      next.push({
        raceNumber: i + 1,
        horseCount: existing ? existing.horseCount : defaultHorses,
      });
    }
    setRaces(next);
  }

  function applyDefaultHorses(n: number) {
    const safe = Math.max(2, Math.min(30, n));
    setDefaultHorses(safe);
    setRaces(races.map((r) => ({ ...r, horseCount: safe })));
  }

  function setHorsesForRace(idx: number, n: number) {
    const safe = Math.max(2, Math.min(30, n));
    setRaces(races.map((r, i) => (i === idx ? { ...r, horseCount: safe } : r)));
  }

  const programDateValid = !Number.isNaN(new Date(meta.programDate).getTime());
  const computedDeadline = programDateValid
    ? new Date(new Date(meta.programDate).getTime() - ONE_HOUR_MS)
    : null;

  const meta1Reasons: string[] = [];
  if (meta.racetrackId <= 0) meta1Reasons.push('Selecciona un club hípico.');
  if (meta.name.trim().length === 0) meta1Reasons.push('Escribe un nombre para el programa.');
  if (!programDateValid) meta1Reasons.push('La fecha y hora del programa son inválidas.');
  const meta1Valid = meta1Reasons.length === 0;

  const racesReasons: string[] = [];
  if (races.length === 0) racesReasons.push('Debes tener al menos una carrera.');
  races.forEach((r) => {
    if (r.horseCount < 2)
      racesReasons.push(`Carrera ${r.raceNumber}: necesita al menos 2 caballos.`);
  });
  const racesValid = racesReasons.length === 0;

  const totalHorses = races.reduce((a, r) => a + r.horseCount, 0);

  const createMut = useMutation({
    mutationFn: async () =>
      (
        await api.post('/programs', {
          racetrackId: Number(meta.racetrackId),
          name: meta.name,
          programDate: new Date(meta.programDate).toISOString(),
          races: races.map((r) => ({
            raceNumber: r.raceNumber,
            horseCount: r.horseCount,
          })),
        })
      ).data,
    onSuccess: () => onCreated(),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-start sm:place-items-center p-3 overflow-y-auto">
      <div className="card w-full max-w-3xl my-4 overflow-hidden">
        {/* Header + steps */}
        <div className="bg-gradient-to-r from-turf-800 to-turf-700 text-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Nuevo programa</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {[
              { n: 1, label: 'Club y fecha' },
              { n: 2, label: 'Carreras y caballos' },
              { n: 3, label: 'Revisar' },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${
                    step >= (s.n as any)
                      ? 'bg-white text-turf-800'
                      : 'bg-white/20 text-white/70'
                  }`}
                >
                  {s.n}
                </div>
                <span
                  className={`text-xs sm:text-sm font-medium ${
                    step >= (s.n as any) ? 'text-white' : 'text-white/60'
                  }`}
                >
                  {s.label}
                </span>
                {i < 2 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      step > (s.n as any) ? 'bg-white' : 'bg-white/20'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">🏟️ Club hípico</label>
                <select
                  className="input"
                  value={meta.racetrackId}
                  onChange={(e) => setMeta({ ...meta, racetrackId: Number(e.target.value) })}
                >
                  <option value={0}>-- elegir --</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nombre del programa</label>
                <input
                  className="input"
                  value={meta.name}
                  onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                  placeholder="Ej: Reunión Sábado"
                />
              </div>
              <div>
                <label className="label">📆 Fecha y hora del programa</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={meta.programDate}
                  onChange={(e) => setMeta({ ...meta, programDate: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  ⏰ Cierre automático (1 h antes):{' '}
                  <b>{computedDeadline ? formatDateTime(computedDeadline) : '—'}</b>
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4">
                <div>
                  <label className="label">Cantidad de carreras</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    className="input"
                    value={raceCount}
                    onChange={(e) => applyRaceCount(Number(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="label">Caballos por carrera (por defecto)</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    className="input"
                    value={defaultHorses}
                    onChange={(e) => applyDefaultHorses(Number(e.target.value) || 2)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Se crearán los caballos automáticamente como Caballo 1, Caballo 2, …
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Ajuste por carrera (opcional)
                </p>
                {races.map((r, idx) => (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <span className="font-semibold text-sm">🏁 Carrera {r.raceNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">caballos:</span>
                      <input
                        type="number"
                        min={2}
                        max={30}
                        className="input max-w-[90px]"
                        value={r.horseCount}
                        onChange={(e) =>
                          setHorsesForRace(idx, Number(e.target.value) || 2)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="font-bold">Resumen</h3>
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
                <p>
                  <b>Club:</b> {tracks.find((t) => t.id === meta.racetrackId)?.name}
                </p>
                <p>
                  <b>Programa:</b> {meta.name}
                </p>
                <p>
                  <b>Fecha y hora:</b> {formatDateTime(meta.programDate)}
                </p>
                <p>
                  <b>Cierre (auto):</b>{' '}
                  {computedDeadline ? formatDateTime(computedDeadline) : '—'}
                </p>
                <p>
                  <b>Carreras:</b> {races.length} · <b>Caballos totales:</b> {totalHorses}
                </p>
                <p className="text-xs text-slate-500 pt-2">
                  Los caballos serán generados automáticamente como{' '}
                  <i>Caballo 1, Caballo 2, …</i> según la cantidad por carrera.
                </p>
              </div>
              {createMut.isError && (
                <p className="text-red-700 text-sm">
                  Error: {(createMut.error as any)?.response?.data?.error || 'inesperado'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-2">
          {(() => {
            const activeReasons =
              step === 1
                ? meta1Reasons
                : step === 2
                ? racesReasons
                : [...meta1Reasons, ...racesReasons];
            if (activeReasons.length === 0) return null;
            return (
              <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
                {activeReasons.map((r) => (
                  <li key={r}>⚠️ {r}</li>
                ))}
              </ul>
            );
          })()}
          <div className="flex justify-between">
            {step > 1 ? (
              <button onClick={() => setStep((s) => (s - 1) as any)} className="btn-ghost">
                ← Atrás
              </button>
            ) : (
              <button onClick={onClose} className="btn-ghost">
                Cancelar
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as any)}
                disabled={step === 1 ? !meta1Valid : step === 2 ? !racesValid : false}
                title={
                  step === 1
                    ? meta1Reasons.join(' ') || undefined
                    : step === 2
                    ? racesReasons.join(' ') || undefined
                    : undefined
                }
                className="btn-primary"
              >
                Continuar →
              </button>
            ) : (
              <button
                onClick={() => createMut.mutate()}
                disabled={!meta1Valid || !racesValid || createMut.isPending}
                title={[...meta1Reasons, ...racesReasons].join(' ') || undefined}
                className="btn-primary"
              >
                {createMut.isPending ? 'Creando...' : '✓ Crear programa'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
