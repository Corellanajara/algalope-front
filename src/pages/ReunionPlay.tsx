import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Reunion, Pick, PublicCartilla, LeaderEntry, displayUserName } from '../lib/types';
import Countdown from '../components/Countdown';
import { formatDate, formatDateTime, timeLeftMs } from '../lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReunionPlay() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const reunionId = Number(id);

  const reunionQ = useQuery({
    queryKey: ['reunion', reunionId],
    queryFn: async () => (await api.get<Reunion>(`/reuniones/${reunionId}`)).data,
  });
  const picksQ = useQuery({
    queryKey: ['picks', 'me'],
    queryFn: async () => (await api.get<Pick[]>('/picks/me')).data,
  });
  const allPicksQ = useQuery({
    queryKey: ['reunion', reunionId, 'all-picks'],
    queryFn: async () =>
      (await api.get<PublicCartilla[]>(`/reuniones/${reunionId}/picks`)).data,
  });
  const reunionScoresQ = useQuery({
    queryKey: ['leaderboard', { reunionId }],
    queryFn: async () =>
      (await api.get<LeaderEntry[]>(`/leaderboard?reunionId=${reunionId}`)).data,
  });

  const [selections, setSelections] = useState<Record<number, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const myPicks = useMemo(
    () => (picksQ.data ?? []).filter((p) => reunionQ.data?.races?.some((r) => r.id === p.raceId)),
    [picksQ.data, reunionQ.data],
  );

  // Initialize from server picks once
  useEffect(() => {
    if (myPicks.length && Object.keys(selections).length === 0) {
      const s: Record<number, number> = {};
      myPicks.forEach((p) => (s[p.raceId] = p.horseId));
      setSelections(s);
    }
  }, [myPicks.length]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const picks = Object.entries(selections).map(([raceId, horseId]) => ({
        raceId: Number(raceId),
        horseId: Number(horseId),
      }));
      return (await api.post(`/reuniones/${reunionId}/picks`, { picks })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['picks'] });
      qc.invalidateQueries({ queryKey: ['reunion', reunionId, 'all-picks'] });
      setToast('✓ Cartilla guardada');
      setTimeout(() => setToast(null), 2800);
    },
  });

  if (reunionQ.isLoading) return <p>Cargando cartilla...</p>;
  if (!reunionQ.data) return <p>Reunión no encontrada.</p>;

  const reunion = reunionQ.data;
  const races = reunion.races ?? [];
  const expired = timeLeftMs(reunion.deadline) <= 0 || reunion.status !== 'OPEN';
  const done = races.filter((r) => selections[r.id]).length;
  const progress = races.length ? Math.round((done / races.length) * 100) : 0;
  const ready = done === races.length && races.length > 0;
  const currentRace = races[currentStep];

  const pointsByUser = useMemo(
    () => new Map((reunionScoresQ.data ?? []).map((e) => [e.user.id, e.points])),
    [reunionScoresQ.data],
  );

  function buildRows() {
    return (allPicksQ.data ?? []).map((c) => {
      const nickname = c.user.pseudonym?.trim() || '';
      const apodo = c.user.displayName ?? '';
      return {
        nickname,
        apodo,
        userId: c.user.id,
        cells: races.map((r) => {
          const pick = c.picks.find((p) => p.raceId === r.id);
          if (!pick) return { text: '—', place: null as 1 | 2 | 3 | null };
          const res = r.result;
          const place: 1 | 2 | 3 | null = res
            ? pick.horseId === res.firstHorseId
              ? 1
              : pick.horseId === res.secondHorseId
              ? 2
              : pick.horseId === res.thirdHorseId
              ? 3
              : null
            : null;
          return { text: pick.horse.name, place };
        }),
        points: pointsByUser.get(c.user.id) ?? 0,
      };
    });
  }

  function downloadCsv() {
    const rows = buildRows();
    const header = [
      'Nickname',
      'Apodo',
      ...races.map((r) => `Carrera ${r.raceNumber}`),
      'Puntaje',
    ];
    const lines = [header];
    for (const r of rows) {
      lines.push([
        r.nickname,
        r.apodo,
        ...r.cells.map((c) => (c.place ? `${c.text} (${c.place}°)` : c.text)),
        String(r.points),
      ]);
    }
    const csv = lines
      .map((row) =>
        row
          .map((cell) => {
            const v = String(cell ?? '');
            return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(';'),
      )
      .join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartillas-${reunion.name.replace(/\s+/g, '_')}-${reunion.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = `${reunion.racetrack?.name ?? ''} — ${reunion.name}`;
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    doc.setFontSize(10);
    doc.text(`Fecha: ${formatDateTime(reunion.reunionDate)}`, 14, 21);
    doc.text(`Cierre: ${formatDateTime(reunion.deadline)}`, 14, 26);

    const head = [
      ['Nickname', 'Apodo', ...races.map((r) => `C.${r.raceNumber}`), 'Puntaje'],
    ];
    const body = buildRows().map((r) => [
      r.nickname,
      r.apodo,
      ...r.cells.map((c) => (c.place ? `${c.text} (${c.place}°)` : c.text)),
      String(r.points),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 32,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [55, 65, 81] },
    });

    const fname = `cartillas-${reunion.name.replace(/\s+/g, '_')}-${reunion.id}.pdf`;
    doc.save(fname);
  }

  return (
    <div className="space-y-6 relative pb-24">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-600 font-medium"
      >
        ← Volver a reuniones
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-4 -bottom-4 text-[160px] opacity-10 select-none">🏇</div>
        <div className="relative">
          <p className="text-white/80 text-xs uppercase tracking-widest font-bold">
            🏟️ {reunion.racetrack?.name}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">{reunion.name}</h1>
          <p className="text-white/80 mt-1">{formatDate(reunion.reunionDate)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-2">
              <span className="text-xs">⏰ Deadline: {formatDateTime(reunion.deadline)}</span>
              <Countdown to={reunion.deadline} />
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar + stepper */}
      <div className="card p-5 sticky top-[72px] z-20 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div>
            <p className="font-bold">
              Carrera {currentStep + 1} de {races.length}
            </p>
            <p className="text-xs text-slate-500">
              ✓ {done} completada{done === 1 ? '' : 's'} · ⏳ {races.length - done} pendiente
              {races.length - done === 1 ? '' : 's'}
            </p>
          </div>
          <span
            className={`chip ${
              ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {progress}% completado
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              ready
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : 'bg-gradient-to-r from-brand-500 to-brand-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {races.map((r, i) => {
            const active = i === currentStep;
            const filled = !!selections[r.id];
            return (
              <button
                key={r.id}
                onClick={() => setCurrentStep(i)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : filled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    filled
                      ? 'bg-emerald-500 text-white'
                      : active
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {filled ? '✓' : r.raceNumber}
                </span>
                <span>Carrera {r.raceNumber}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current race horses */}
      {currentRace && (
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              Carrera {currentRace.raceNumber} — elige tu caballo
            </h2>
            <span className="text-sm text-slate-500">
              {currentRace.horses?.length ?? 0} opciones
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {currentRace.horses?.map((h) => {
              const isSel = selections[currentRace.id] === h.id;
              const res = currentRace.result;
              const place = res
                ? h.id === res.firstHorseId
                  ? 1
                  : h.id === res.secondHorseId
                  ? 2
                  : h.id === res.thirdHorseId
                  ? 3
                  : null
                : null;
              return (
                <button
                  key={h.id}
                  disabled={expired}
                  onClick={() => {
                    setSelections({ ...selections, [currentRace.id]: h.id });
                    // Auto-advance to next unselected race for smoother flow
                    setTimeout(() => {
                      const nextIdx = races.findIndex(
                        (r, i) => i > currentStep && !selections[r.id] && r.id !== currentRace.id,
                      );
                      if (nextIdx !== -1) setCurrentStep(nextIdx);
                    }, 250);
                  }}
                  className={`relative text-left p-4 rounded-2xl border-2 transition-all ${
                    isSel
                      ? 'border-brand-500 bg-brand-50 shadow-lg scale-[1.01]'
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-md'
                  } ${expired ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg shrink-0 ${
                        isSel ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {h.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{h.name}</p>
                      {h.odds != null && (
                        <p className="text-xs text-slate-500">Pago estimado {h.odds}x</p>
                      )}
                    </div>
                    {isSel && <span className="chip bg-brand-600 text-white">✓</span>}
                    {place && (
                      <span
                        className={`chip ${
                          place === 1
                            ? 'bg-yellow-100 text-yellow-800'
                            : place === 2
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="btn-ghost"
            >
              ← Carrera anterior
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(races.length - 1, currentStep + 1))}
              disabled={currentStep === races.length - 1}
              className="btn-ghost"
            >
              Carrera siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Cartillas públicas — transparencia */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              👥 Cartillas de todos los usuarios
            </h2>
            <p className="text-xs text-slate-500">
              Visualización pública para garantizar transparencia.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip bg-slate-100 text-slate-700">
              {allPicksQ.data?.length ?? 0} usuario{(allPicksQ.data?.length ?? 0) === 1 ? '' : 's'}
            </span>
            {(allPicksQ.data?.length ?? 0) > 0 && (
              <button onClick={downloadCsv} className="btn-ghost text-sm">
                📊 CSV
              </button>
            )}
            {expired && (allPicksQ.data?.length ?? 0) > 0 && (
              <button onClick={downloadPdf} className="btn-primary text-sm">
                📄 PDF
              </button>
            )}
          </div>
        </div>
        {allPicksQ.isLoading ? (
          <p className="text-sm text-slate-500">Cargando cartillas…</p>
        ) : (allPicksQ.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay cartillas registradas para esta reunión.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 font-semibold text-left sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_rgb(226_232_240)]">
                    <div className="text-xs uppercase tracking-wider text-slate-600 text-center">
                      Nickname
                    </div>
                    <div className="text-[10px] font-normal text-slate-400 text-center">
                      Apodo
                    </div>
                  </th>
                  {races.map((r) => (
                    <th
                      key={r.id}
                      className="py-3 px-3 font-semibold text-center whitespace-nowrap text-xs uppercase tracking-wider text-slate-600"
                    >
                      C.{r.raceNumber}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold text-center text-xs uppercase tracking-wider text-slate-600">
                    Puntaje
                  </th>
                </tr>
              </thead>
              <tbody>
                {allPicksQ.data!.map((c) => {
                  const isMe = user?.id === c.user.id;
                  const nickname = c.user.pseudonym?.trim() || '—';
                  const apodo = c.user.displayName;
                  const points = pointsByUser.get(c.user.id) ?? 0;
                  return (
                    <tr
                      key={c.user.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/60 transition ${
                        isMe ? 'bg-brand-50' : ''
                      }`}
                    >
                      <td
                        className={`py-3 px-4 align-middle sticky left-0 z-10 shadow-[1px_0_0_0_rgb(226_232_240)] ${
                          isMe ? 'bg-brand-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white grid place-items-center text-xs font-bold shrink-0">
                            {displayUserName(c.user).slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold truncate flex items-center gap-1.5">
                              {nickname}
                              {isMe && (
                                <span className="chip bg-brand-600 text-white text-[10px]">tú</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{apodo}</div>
                          </div>
                        </div>
                      </td>
                      {races.map((r) => {
                        const pick = c.picks.find((p) => p.raceId === r.id);
                        const res = r.result;
                        const place = pick && res
                          ? pick.horseId === res.firstHorseId
                            ? 1
                            : pick.horseId === res.secondHorseId
                            ? 2
                            : pick.horseId === res.thirdHorseId
                            ? 3
                            : null
                          : null;
                        return (
                          <td key={r.id} className="py-3 px-3 whitespace-nowrap text-center align-middle">
                            {pick ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                                  place === 1
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : place === 2
                                    ? 'bg-slate-200 text-slate-700'
                                    : place === 3
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {pick.horse.name}
                                {place === 1 ? ' 🥇' : place === 2 ? ' 🥈' : place === 3 ? ' 🥉' : ''}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center font-extrabold text-brand-600 tabular-nums align-middle">
                        {points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary sticky bar */}
      <div className="fixed left-0 right-0 bottom-0 z-30 p-3 bg-white border-t border-slate-200 shadow-[0_-6px_20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-6xl flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">
              {ready ? '🎉 Cartilla lista' : `Faltan ${races.length - done} carrera${races.length - done === 1 ? '' : 's'} por elegir`}
            </p>
            <p className="text-sm font-semibold truncate">
              {reunion.racetrack?.name} · {reunion.name}
            </p>
          </div>
          {expired ? (
            <span className="chip bg-slate-200 text-slate-700">⛔ Deadline cerrado</span>
          ) : (
            <>
              <button onClick={() => nav('/')} className="btn-ghost">
                Salir
              </button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={!ready || saveMut.isPending}
                className="btn-primary"
              >
                {saveMut.isPending ? 'Guardando...' : myPicks.length ? 'Actualizar cartilla' : 'Enviar cartilla'}
              </button>
            </>
          )}
        </div>
        {saveMut.isError && (
          <p className="text-center text-sm text-red-700 mt-1">
            {(saveMut.error as any)?.response?.data?.error || 'Error inesperado'}
          </p>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium z-40">
          {toast}
        </div>
      )}
    </div>
  );
}
