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

/** Russian plural forms: 1 минута / 2 минуты / 5 минут. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/**
 * Human-readable presence line for a chat header / chat list row.
 * Returns "В сети" while the user is inside the online window.
 */
export function formatLastSeen(lastSeenAt?: string | null, now: number = Date.now()): string {
  const ms = parse(lastSeenAt);
  if (ms === null) return "Был(-а) в сети недавно";
  if (isOnline(lastSeenAt, now)) return "В сети";

  const diff = Math.max(0, now - ms);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) {
    return `Был(-а) в сети ${minutes} ${plural(minutes, "минуту", "минуты", "минут")} назад`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Был(-а) в сети ${hours} ${plural(hours, "час", "часа", "часов")} назад`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Был(-а) в сети ${days} ${plural(days, "день", "дня", "дней")} назад`;
  }

  const date = new Date(ms);
  return `Был(-а) в сети ${date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;
}
