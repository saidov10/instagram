/**
 * Presence helpers built on the backend's `lastSeenAt` (ISO string).
 * A user counts as online when their last activity ping landed within ONLINE_WINDOW_MS.
 */

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/** How often the client re-announces itself via PUT /User/update-activity. */
export const ACTIVITY_PING_INTERVAL_MS = 30 * 1000;

const parse = (lastSeenAt?: string | null): number | null => {
  if (!lastSeenAt) return null;
  const ms = new Date(lastSeenAt).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export function isOnline(lastSeenAt?: string | null, now: number = Date.now()): boolean {
  const ms = parse(lastSeenAt);
  if (ms === null) return false;
  return now - ms < ONLINE_WINDOW_MS;
}

/**
 * Human-readable presence line for a chat header.
 * - Inside the online window → "В сети".
 * - Otherwise → the exact clock time the user was last seen, e.g. "Был(-а) в сети в 14:00",
 *   prefixed with "вчера" / a date for older days (Instagram/Telegram style) instead of a
 *   relative "N минут назад" — a fixed time reads calmer and doesn't drift every tick.
 */
export function formatLastSeen(lastSeenAt?: string | null, now: number = Date.now()): string {
  const ms = parse(lastSeenAt);
  if (ms === null) return "Был(-а) в сети недавно";
  if (isOnline(lastSeenAt, now)) return "В сети";

  const date = new Date(ms);
  const nowDate = new Date(now);
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Today → just the time.
  if (ms >= startOfToday) return `Был(-а) в сети в ${time}`;
  // Yesterday.
  if (ms >= startOfToday - dayMs) return `Был(-а) в сети вчера в ${time}`;

  // Older → date + time (include the year only when it differs from the current one).
  const dateLabel = date.toLocaleDateString(
    "ru-RU",
    date.getFullYear() === nowDate.getFullYear()
      ? { day: "numeric", month: "long" }
      : { day: "numeric", month: "long", year: "numeric" },
  );
  return `Был(-а) в сети ${dateLabel} в ${time}`;
}
