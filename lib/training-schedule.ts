export type TrainingSessionRow = {
  id?: string;
  class_id?: string;
  delivery_mode: "live" | "online";
  session_date: string;
  start_time: string;
  end_time: string;
  class?: {
    name?: string | null;
    branch?: { name?: string | null } | null;
    level?: { name?: string | null; sort_order?: number | null } | null;
  } | null;
};

export function formatClock(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || "0");
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
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

export function getCurrentMonthBounds(date = new Date()) {
  const { year, month } = getBeirutDateParts(date);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    first: `${year}-${String(month).padStart(2, "0")}-01`,
    last: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getCurrentMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatSessionDate(value: string, includeWeekday = true) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    ...(includeWeekday ? { weekday: "short" as const } : {}),
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatDateList(values: string[]) {
  return [...new Set(values)].sort().map((value) => formatSessionDate(value)).join(" · ");
}

export function getPublicSessionSlots(rows: TrainingSessionRow[], branchName: string, mode: "live" | "online") {
  const branchRows = rows.filter((row) => row.class?.branch?.name === branchName && row.delivery_mode === mode);
  const grouped = new Map<string, {
    level: string;
    className: string;
    levelOrder: number;
    startTime: string;
    endTime: string;
    dates: string[];
  }>();

  for (const row of branchRows) {
    const level = row.class?.level?.name || "Training";
    const className = row.class?.name || level;
    const key = `${className}|${row.start_time}|${row.end_time}`;
    const current = grouped.get(key) || {
      level,
      className,
      levelOrder: row.class?.level?.sort_order ?? 999,
      startTime: row.start_time,
      endTime: row.end_time,
      dates: [],
    };
    current.dates.push(row.session_date);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((item) => ({ ...item, dates: [...new Set(item.dates)].sort() }))
    .sort((a, b) => a.levelOrder - b.levelOrder || a.startTime.localeCompare(b.startTime) || a.className.localeCompare(b.className));
}

export type RemainingTrainingSession = {
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  modes: Array<"live" | "online">;
};

export function getRemainingTrainingSessions(rows: TrainingSessionRow[], date = new Date()) {
  const today = getBeirutIsoDate(date);
  const { last } = getCurrentMonthBounds(date);
  const merged = new Map<string, RemainingTrainingSession>();

  for (const row of rows) {
    if (row.session_date < today || row.session_date > last) continue;
    const key = `${row.session_date}|${row.start_time}|${row.end_time}`;
    const existing = merged.get(key);
    if (existing) {
      if (!existing.modes.includes(row.delivery_mode)) existing.modes.push(row.delivery_mode);
      continue;
    }

    merged.set(key, {
      date: row.session_date,
      dateLabel: formatSessionDate(row.session_date),
      startTime: row.start_time,
      endTime: row.end_time,
      modes: [row.delivery_mode],
    });
  }

  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export function modeLabel(modes: Array<"live" | "online">) {
  if (modes.includes("live") && modes.includes("online")) return "Inside Academy + Online";
  return modes[0] === "online" ? "Online" : "Inside Academy";
}
