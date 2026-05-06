import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Reunion, Racetrack } from '../../lib/types';
import { formatDateTime } from '../../lib/utils';
import { HorsesAdminPanel } from './EnterResults';

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
  favoriteNumber: number;
}

export default function ManageReuniones() {
  const qc = useQueryClient();
  const tracksQ = useQuery({
    queryKey: ['racetracks'],
    queryFn: async () => (await api.get<Racetrack[]>('/racetracks')).data,
  });
  const reunionesQ = useQuery({
    queryKey: ['reuniones', 'all'],
    queryFn: async () => (await api.get<Reunion[]>('/reuniones')).data,
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Reunion | null>(null);

  const delMut = useMutation({
    mutationFn: async (id: number) => api.delete(`/reuniones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reuniones'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Reuniones</h1>
          <p className="text-slate-600">Cada reunión pertenece a un club con múltiples carreras.</p>
        </div>
        <button onClick={() => setWizardOpen(true)} className="btn-primary">
          + Nueva reunión
        </button>
      </div>

      {wizardOpen && (
        <ReunionWizard
          tracks={tracksQ.data ?? []}
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['reuniones'] });
            setWizardOpen(false);
          }}
        />
      )}

      {editing && (
        <EditReunionModal
          reunion={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['reuniones'] });
            setEditing(null);
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {reunionesQ.data?.length === 0 && (
          <div className="card p-8 text-center col-span-full">
            <p className="text-slate-600">No hay reuniones. Crea la primera.</p>
          </div>
        )}
        {[...(reunionesQ.data ?? [])]
          .sort(
            (a, b) =>
              new Date(b.reunionDate).getTime() - new Date(a.reunionDate).getTime(),
          )
          .map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase font-bold text-brand-600 tracking-wider">
                  🏟️ {r.racetrack?.name}
                </p>
                <h3 className="font-bold text-lg">{r.name}</h3>
                <p className="text-sm text-slate-500">{formatDateTime(r.reunionDate)}</p>
                <p className="text-xs text-slate-400">⏰ Cierre: {formatDateTime(r.deadline)}</p>
              </div>
              <span
                className={`chip ${
                  r.status === 'SETTLED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : r.status === 'CLOSED'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {r.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {r.races?.length ?? 0} carrera{(r.races?.length ?? 0) === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditing(r)}
                  className="text-brand-600 text-sm hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${r.name}"?`)) delMut.mutate(r.id);
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

function EditReunionModal({
  reunion,
  onClose,
  onSaved,
}: {
  reunion: Reunion;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: reunion.name,
    reunionDate: toLocalInput(new Date(reunion.reunionDate)),
    status: reunion.status,
  });

  const fullReunionQ = useQuery({
    queryKey: ['reunion', reunion.id, 'edit'],
    queryFn: async () => (await api.get<Reunion>(`/reuniones/${reunion.id}`)).data,
  });
  const races = fullReunionQ.data?.races ?? reunion.races ?? [];

  const updateMut = useMutation({
    mutationFn: async () =>
      (
        await api.put(`/reuniones/${reunion.id}`, {
          name: form.name,
          reunionDate: new Date(form.reunionDate).toISOString(),
          status: form.status,
        })
      ).data,
    onSuccess: () => onSaved(),
  });

  const nameTrimmed = form.name.trim();
  const reunionDateValid = !Number.isNaN(new Date(form.reunionDate).getTime());
  const computedDeadline = reunionDateValid
    ? new Date(new Date(form.reunionDate).getTime() - ONE_HOUR_MS)
    : null;

  const reasons: string[] = [];
  if (!nameTrimmed) reasons.push('El nombre no puede estar vacío.');
  if (!reunionDateValid) reasons.push('La fecha y hora de la reunión son inválidas.');

  const canSave = reasons.length === 0 && !updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-3 overflow-y-auto">
      <div className="card w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-turf-800 to-turf-700 text-white p-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Editar reunión</h2>
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
            <label className="label">📆 Fecha y hora de la reunión</label>
            <input
              type="datetime-local"
              className="input"
              value={form.reunionDate}
              onChange={(e) => setForm({ ...form, reunionDate: e.target.value })}
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
              onChange={(e) => setForm({ ...form, status: e.target.value as Reunion['status'] })}
            >
              <option value="OPEN">OPEN — abierto a selecciones</option>
              <option value="CLOSED">CLOSED — cerrado</option>
              <option value="SETTLED">SETTLED — liquidado</option>
            </select>
          </div>
          <ReunionPdfManager reunion={reunion} />
          <div className="border-t border-slate-100 pt-3">
            <p className="label mb-2">Caballos por carrera</p>
            {races.length === 0 ? (
              <p className="text-sm text-slate-500">Cargando carreras…</p>
            ) : (
              <div className="space-y-3">
                {races.map((r) => (
                  <div key={r.id} className="bg-slate-50 rounded-xl p-3">
                    <p className="font-semibold text-sm mb-2">🏁 Carrera {r.raceNumber}</p>
                    <HorsesAdminPanel race={r} />
                  </div>
                ))}
              </div>
            )}
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

// --- PDF manager ---

function ReunionPdfManager({ reunion }: { reunion: Reunion }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (file.type !== 'application/pdf') throw new Error('Debe ser un PDF');
      if (file.size > 20 * 1024 * 1024) throw new Error('El PDF supera 20 MB');
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = String(r.result ?? '');
          const idx = s.indexOf(',');
          resolve(idx >= 0 ? s.slice(idx + 1) : s);
        };
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      return (
        await api.post(`/reuniones/${reunion.id}/document`, {
          filename: file.name,
          dataBase64,
        })
      ).data;
    },
    onSuccess: () => {
      setUploadError(null);
      qc.invalidateQueries({ queryKey: ['reuniones'] });
    },
    onError: (e: any) => {
      setUploadError(e?.response?.data?.error || e?.message || 'Error al subir el PDF');
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => api.delete(`/reuniones/${reunion.id}/document`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reuniones'] }),
  });

  const doc = reunion.document ?? null;

  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
      <p className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">
        📄 Programa (PDF)
      </p>
      {doc ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm min-w-0">
            <p className="font-semibold truncate">{doc.filename}</p>
            <p className="text-xs text-slate-500">
              Subido: {formatDateTime(doc.uploadedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-ghost text-sm"
              disabled={uploadMut.isPending}
            >
              Reemplazar
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Eliminar el PDF adjunto?')) deleteMut.mutate();
              }}
              className="text-red-600 text-sm hover:underline"
              disabled={deleteMut.isPending}
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn-ghost text-sm"
          disabled={uploadMut.isPending}
        >
          {uploadMut.isPending ? 'Subiendo...' : 'Subir PDF'}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) uploadMut.mutate(f);
        }}
      />
      {uploadError && (
        <p className="text-red-700 text-xs mt-2">{uploadError}</p>
      )}
    </div>
  );
}

// --- Wizard ---

function ReunionWizard({
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
    name: 'Reunión Nº',
    reunionDate: toLocalInput(new Date(now.getTime() + 2 * 86400000)),
  });

  // Optional manual deadline override. If not used, deadline = reunionDate - 1h.
  const [useCustomDeadline, setUseCustomDeadline] = useState(false);
  const [customDeadline, setCustomDeadline] = useState('');

  const [raceCount, setRaceCount] = useState(1);
  const [defaultHorses, setDefaultHorses] = useState(12);
  const [races, setRaces] = useState<DraftRace[]>([
    { raceNumber: 1, horseCount: 12, favoriteNumber: 1 },
  ]);

  function applyRaceCount(n: number) {
    const safe = Math.max(1, Math.min(40, n));
    setRaceCount(safe);
    const next: DraftRace[] = [];
    for (let i = 0; i < safe; i++) {
      const existing = races[i];
      next.push({
        raceNumber: i + 1,
        horseCount: existing ? existing.horseCount : defaultHorses,
        favoriteNumber: existing?.favoriteNumber ?? 1,
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
    setRaces(
      races.map((r, i) => {
        if (i !== idx) return r;
        const fav = r.favoriteNumber && r.favoriteNumber <= safe ? r.favoriteNumber : 1;
        return { ...r, horseCount: safe, favoriteNumber: fav };
      }),
    );
  }

  function setFavoriteForRace(idx: number, n: number) {
    setRaces(races.map((r, i) => (i === idx ? { ...r, favoriteNumber: n } : r)));
  }

  const reunionDateValid = !Number.isNaN(new Date(meta.reunionDate).getTime());
  const autoDeadline = reunionDateValid
    ? new Date(new Date(meta.reunionDate).getTime() - ONE_HOUR_MS)
    : null;
  const customDeadlineDate = useCustomDeadline && customDeadline
    ? new Date(customDeadline)
    : null;
  const effectiveDeadline = useCustomDeadline ? customDeadlineDate : autoDeadline;

  const meta1Reasons: string[] = [];
  if (meta.racetrackId <= 0) meta1Reasons.push('Selecciona un club hípico.');
  if (meta.name.trim().length === 0) meta1Reasons.push('Escribe un nombre para la reunión.');
  if (!reunionDateValid) meta1Reasons.push('La fecha y hora de la reunión son inválidas.');
  if (useCustomDeadline) {
    if (!customDeadline || Number.isNaN(new Date(customDeadline).getTime())) {
      meta1Reasons.push('La fecha de cierre personalizada es inválida.');
    } else if (
      reunionDateValid &&
      new Date(customDeadline).getTime() >= new Date(meta.reunionDate).getTime()
    ) {
      meta1Reasons.push('El cierre debe ser anterior a la fecha de la reunión.');
    }
  }
  const meta1Valid = meta1Reasons.length === 0;

  const racesReasons: string[] = [];
  if (races.length === 0) racesReasons.push('Debes tener al menos una carrera.');
  races.forEach((r) => {
    if (r.horseCount < 2)
      racesReasons.push(`Carrera ${r.raceNumber}: necesita al menos 2 caballos.`);
    if (!r.favoriteNumber || r.favoriteNumber < 1 || r.favoriteNumber > r.horseCount)
      racesReasons.push(`Carrera ${r.raceNumber}: debe tener un favorito.`);
  });
  const racesValid = racesReasons.length === 0;

  const totalHorses = races.reduce((a, r) => a + r.horseCount, 0);

  const createMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        racetrackId: Number(meta.racetrackId),
        name: meta.name,
        reunionDate: new Date(meta.reunionDate).toISOString(),
        races: races.map((r) => ({
          raceNumber: r.raceNumber,
          horseCount: r.horseCount,
          favoriteNumber: r.favoriteNumber,
        })),
      };
      if (useCustomDeadline && customDeadlineDate) {
        body.deadline = customDeadlineDate.toISOString();
      }
      return (await api.post('/reuniones', body)).data as Reunion;
    },
    onSuccess: () => onCreated(),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-start sm:place-items-center p-3 overflow-y-auto">
      <div className="card w-full max-w-3xl my-4 overflow-hidden">
        {/* Header + steps */}
        <div className="bg-gradient-to-r from-turf-800 to-turf-700 text-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Nueva reunión</h2>
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
                <label className="label">Nombre de la reunión</label>
                <input
                  className="input"
                  value={meta.name}
                  onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                  placeholder="Ej: Reunión Sábado"
                />
              </div>
              <div>
                <label className="label">📆 Fecha y hora de la reunión</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={meta.reunionDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMeta({ ...meta, reunionDate: v });
                    if (!useCustomDeadline && !Number.isNaN(new Date(v).getTime())) {
                      const def = new Date(new Date(v).getTime() - ONE_HOUR_MS);
                      setCustomDeadline(toLocalInput(def));
                    }
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">
                  ⏰ Cierre automático (1 h antes):{' '}
                  <b>{autoDeadline ? formatDateTime(autoDeadline) : '—'}</b>
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={useCustomDeadline}
                    onChange={(e) => {
                      setUseCustomDeadline(e.target.checked);
                      if (e.target.checked && !customDeadline && autoDeadline) {
                        setCustomDeadline(toLocalInput(autoDeadline));
                      }
                    }}
                  />
                  Personalizar fecha de cierre
                </label>
                {useCustomDeadline && (
                  <div>
                    <input
                      type="datetime-local"
                      className="input"
                      value={customDeadline}
                      onChange={(e) => setCustomDeadline(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Por defecto se usa 1 h antes de la reunión.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4">
                <div>
                  <label className="label">Cantidad de carreras</label>
                  <IntInput
                    value={raceCount}
                    min={1}
                    max={40}
                    onCommit={applyRaceCount}
                  />
                </div>
                <div>
                  <label className="label">Caballos por carrera (por defecto)</label>
                  <IntInput
                    value={defaultHorses}
                    min={2}
                    max={30}
                    onCommit={applyDefaultHorses}
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
                    className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <span className="font-semibold text-sm">🏁 Carrera {r.raceNumber}</span>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">caballos:</span>
                        <IntInput
                          value={r.horseCount}
                          min={2}
                          max={30}
                          className="max-w-[90px]"
                          onCommit={(n) => setHorsesForRace(idx, n)}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">⭐ favorito #:</span>
                        <select
                          className="input max-w-[110px] py-1.5 text-sm"
                          value={r.favoriteNumber ?? 1}
                          onChange={(e) => setFavoriteForRace(idx, Number(e.target.value))}
                        >
                          {Array.from({ length: r.horseCount }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              #{n}
                            </option>
                          ))}
                        </select>
                      </div>
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
                  <b>Reunión:</b> {meta.name}
                </p>
                <p>
                  <b>Fecha y hora:</b> {formatDateTime(meta.reunionDate)}
                </p>
                <p>
                  <b>Cierre:</b>{' '}
                  {effectiveDeadline ? formatDateTime(effectiveDeadline) : '—'}
                  {useCustomDeadline ? ' (personalizado)' : ' (auto, 1 h antes)'}
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
                {createMut.isPending ? 'Creando...' : '✓ Crear reunión'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Numeric input that lets the user clear it freely while typing.
function IntInput({
  value,
  min,
  max,
  onCommit,
  className = '',
}: {
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string>(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current && draft !== String(value)) setDraft(String(value));
  }, [value]);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft}
      className={`input ${className}`}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        if (v === '') return;
        const n = Number(v);
        if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
      }}
      onBlur={() => {
        focused.current = false;
        const n = Number(draft);
        if (draft === '' || !Number.isFinite(n) || n < min) {
          setDraft(String(min));
          onCommit(min);
        } else if (n > max) {
          setDraft(String(max));
          onCommit(max);
        } else {
          setDraft(String(n));
        }
      }}
    />
  );
}
