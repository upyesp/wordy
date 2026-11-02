/**
 * Daily board and streak (ADR-0004). The board dealt at boot is seeded by the
 * player's *local* calendar day, so it stays the same all day (and is the same
 * board for everyone playing that day). The streak counts consecutive local
 * days on which at least one word was scored — opening the app is not enough.
 *
 * Everything lives in localStorage next to `wordy.best`; it is device-local.
 */
const KEY = 'wordy.daily';
const DAY_MS = 86_400_000;

interface DailyRecord {
  /** Local day index (days since 1970-01-01, local midnight). */
  day: number;
  streak: number;
}

function localDayIndex(d: Date = new Date()): number {
  // Reconstruct local wall-clock time, then floor to a day boundary.
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / DAY_MS);
}

function load(): DailyRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<DailyRecord>;
    if (typeof value.day !== 'number' || typeof value.streak !== 'number') return null;
    return { day: value.day, streak: value.streak };
  } catch {
    return null;
  }
}

function save(record: DailyRecord): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* private mode: the streak stays in-memory for this visit */
  }
}

/** Whether a word has already been scored today (so today's play is counted). */
export function hasPlayedToday(): boolean {
  return load()?.day === localDayIndex();
}

/** The streak to display: today's or yesterday's count, otherwise broken (0). */
export function streakNow(): number {
  const record = load();
  if (!record) return 0;
  const gap = localDayIndex() - record.day;
  return gap === 0 || gap === 1 ? record.streak : 0;
}

/** Count today as played (first scored word) and return the resulting streak. */
export function markPlayed(): number {
  const today = localDayIndex();
  const record = load();
  if (record?.day === today) return record.streak;
  const streak = record && today - record.day === 1 ? record.streak + 1 : 1;
  save({ day: today, streak });
  return streak;
}

/** A 32-bit seed that depends only on the local day. */
export function dailySeed(): number {
  return Math.imul(localDayIndex(), 0x9e3779b1) >>> 0;
}

/** Mulberry32 — tiny, fast, deterministic PRNG returning values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
