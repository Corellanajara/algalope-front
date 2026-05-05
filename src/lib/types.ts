export interface Racetrack { id: number; name: string; city: string; }
export interface RaceWeek { id: number; year: number; weekNumber: number; startDate: string; endDate: string; }
export interface Horse { id: number; raceId: number; number: number; name: string; odds: number | null; }
export interface RaceResult {
  id: number; raceId: number;
  firstHorseId: number; secondHorseId: number; thirdHorseId: number;
  winnerDividend: number; settledAt: string;
}
export interface Race {
  id: number; reunionId: number; raceNumber: number;
  status: 'OPEN' | 'CLOSED' | 'SETTLED';
  horses?: Horse[];
  result?: RaceResult | null;
  reunion?: Reunion;
}
export interface Reunion {
  id: number; racetrackId: number; weekId: number;
  name: string; reunionDate: string; deadline: string;
  status: 'OPEN' | 'CLOSED' | 'SETTLED';
  racetrack?: Racetrack;
  week?: RaceWeek;
  races?: Race[];
}
export interface Pick {
  id: number; userId: number; raceId: number; horseId: number;
  horse?: Horse; race?: Race;
}
export interface PublicCartilla {
  user: { id: number; displayName: string; pseudonym?: string | null; email: string };
  picks: { raceId: number; horseId: number; horse: Horse }[];
}
export interface LeaderEntry {
  rank: number;
  user: { id: number; displayName: string; pseudonym?: string | null; email: string };
  points: number;
  races: number;
}

export interface Programa {
  id: number; userId: number; weekId: number;
  paid: boolean; paidAt: string | null; note: string | null;
  user?: { id: number; displayName: string; email: string };
  week?: RaceWeek;
}

export function displayUserName(u: {
  displayName?: string;
  pseudonym?: string | null;
  email?: string;
}): string {
  return (u.pseudonym && u.pseudonym.trim()) || u.displayName || u.email || '—';
}
