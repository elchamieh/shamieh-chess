export type TrainingScheduleRow = {
  id?: string;
  branch_id?: string;
  level_id?: string;
  class_id?: string;
  delivery_mode: "live" | "online";
  weekday: number;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_to: string | null;
  branch?: { name?: string | null } | null;
  level?: { name?: string | null; sort_order?: number | null } | null;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatClock(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || "0");
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatWeekdays(values: number[]) {
  const names = [...new Set(values)].sort((a, b) => a - b).map((value) => WEEKDAYS[value] || "");
  if (!names.length) return "";
  if (names.length === 1) return `${names[0]}s`;
  if (names.length === 2) return `${names[0]}s & ${names[1]}s`;
  return `${names.slice(0, -1).map((name) => `${name}s`).join(", ")} & ${names[names.length - 1]}s`;
}

export function getPublicScheduleSlots(rows: TrainingScheduleRow[], branchName: string, mode: "live" | "online") {
  const branchRows = rows.filter((row) => row.branch?.name === branchName && row.delivery_mode === mode);
  const grouped = new Map<string, {
    level: string;
    levelOrder: number;
    startTime: string;
    endTime: string;
    weekdays: number[];
  }>();

  for (const row of branchRows) {
    const level = row.level?.name || "Training";
    const key = `${level}|${row.start_time}|${row.end_time}`;
    const current = grouped.get(key) || {
      level,
      levelOrder: row.level?.sort_order ?? 999,
      startTime: row.start_time,
      endTime: row.end_time,
      weekdays: [],
    };
    current.weekdays.push(row.weekday);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((item) => ({ ...item, weekdays: [...new Set(item.weekdays)] }))
    .sort((a, b) => a.levelOrder - b.levelOrder || a.startTime.localeCompare(b.startTime));
}

function getBeirutDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Beirut",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: read("year"), month: read("month"), day: read("day") };
}

export function getBeirutIsoDate(date = new Date()) {
  const { year, month, day } = getBeirutDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getCurrentMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    month: "long",
    year: "numeric",
  }).format(date);
}

export type RemainingTrainingSession = {
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  modes: Array<"live" | "online">;
};

export function getRemainingTrainingSessions(rows: TrainingScheduleRow[], date = new Date()) {
  const { year, month, day } = getBeirutDateParts(date);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const merged = new Map<string, RemainingTrainingSession>();

  for (let currentDay = day; currentDay <= daysInMonth; currentDay += 1) {
    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`;
    const weekday = new Date(Date.UTC(year, month - 1, currentDay, 12)).getUTCDay();

    for (const row of rows) {
      if (row.weekday !== weekday) continue;
      if (isoDate < row.effective_from) continue;
      if (row.effective_to && isoDate > row.effective_to) continue;

      const key = `${isoDate}|${row.start_time}|${row.end_time}`;
      const existing = merged.get(key);
      if (existing) {
        if (!existing.modes.includes(row.delivery_mode)) existing.modes.push(row.delivery_mode);
        continue;
      }

      const labelDate = new Date(`${isoDate}T12:00:00Z`);
      merged.set(key, {
        date: isoDate,
        dateLabel: new Intl.DateTimeFormat("en-GB", {
          timeZone: "UTC",
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(labelDate),
        startTime: row.start_time,
        endTime: row.end_time,
        modes: [row.delivery_mode],
      });
    }
  }

  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function modeLabel(modes: Array<"live" | "online">) {
  if (modes.includes("live") && modes.includes("online")) return "Live + Online";
  return modes[0] === "online" ? "Online" : "Inside Academy";
}
