import { useEffect, useState } from 'react';
import { formatCountdown, timeLeftMs } from '../lib/utils';

export default function Countdown({ to }: { to: string | Date }) {
  const [ms, setMs] = useState(() => timeLeftMs(to));
  useEffect(() => {
    const i = setInterval(() => setMs(timeLeftMs(to)), 1000);
    return () => clearInterval(i);
  }, [to]);
  const expired = ms <= 0;
  const urgent = !expired && ms < 1000 * 60 * 60; // < 1h
  return (
    <span
      className={`chip font-bold ${
        expired
          ? 'bg-slate-200 text-slate-600'
          : urgent
          ? 'bg-red-100 text-red-700 animate-pulse'
          : 'bg-amber-100 text-amber-800'
      }`}
    >
      {expired ? '⛔ Cerrado' : `⏳ ${formatCountdown(ms)}`}
    </span>
  );
}
