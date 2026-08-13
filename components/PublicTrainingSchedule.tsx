import {
  formatClock,
  formatWeekdays,
  getPublicScheduleSlots,
  type TrainingScheduleRow,
} from "@/lib/training-schedule";

function scheduleMonthLabel(rows: TrainingScheduleRow[]) {
  const firstDate = rows.map((row) => row.effective_from).sort()[0];
  if (!firstDate) return "Current Training Schedule";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${firstDate}T12:00:00Z`));
}

function ModeSchedule({
  rows,
  branch,
  mode,
}: {
  rows: TrainingScheduleRow[];
  branch: string;
  mode: "live" | "online";
}) {
  const slots = getPublicScheduleSlots(rows, branch, mode);
  if (!slots.length) return null;

  const branchModeRows = rows.filter((row) => row.branch?.name === branch && row.delivery_mode === mode);
  const dayLabel = formatWeekdays(branchModeRows.map((row) => row.weekday));

  return (
    <div className={`public-schedule-mode public-schedule-${mode}`}>
      <div className="public-schedule-mode-heading">
        <div>
          <span className="public-schedule-icon" aria-hidden="true">{mode === "live" ? "♟" : "◉"}</span>
          <div>
            <b>{mode === "live" ? "Inside Academy" : "Online Classes"}</b>
            <span>{dayLabel}</span>
          </div>
        </div>
      </div>
      <div className="public-schedule-slots">
        {slots.map((slot) => (
          <div className="public-schedule-slot" key={`${slot.level}-${slot.startTime}-${slot.endTime}`}>
            <span>{slot.level}</span>
            <b>{formatClock(slot.startTime)} – {formatClock(slot.endTime)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicTrainingSchedule({ rows }: { rows: TrainingScheduleRow[] }) {
  if (!rows.length) return null;
  const monthLabel = scheduleMonthLabel(rows);

  return (
    <section className="public-section public-training-schedule" id="schedule">
      <div className="public-section-heading">
        <span className="public-eyebrow">TRAINING TIMES</span>
        <h2>{monthLabel} Training Schedule</h2>
        <p>Choose the branch that works for you. Live and online training times are listed separately for Saida and Beirut.</p>
      </div>

      <div className="public-schedule-branches">
        {(["Saida", "Beirut"] as const).map((branch, index) => {
          const branchRows = rows.filter((row) => row.branch?.name === branch);
          if (!branchRows.length) return null;
          return (
            <article className="public-schedule-branch" key={branch}>
              <div className="public-schedule-branch-title">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className="public-eyebrow">{branch.toUpperCase()} BRANCH</div>
                  <h3>{branch}</h3>
                </div>
              </div>
              <ModeSchedule rows={rows} branch={branch} mode="live" />
              <ModeSchedule rows={rows} branch={branch} mode="online" />
            </article>
          );
        })}
      </div>
      <p className="public-schedule-note">Published schedule applies to the month shown above. Class placement determines the exact time a registered student should attend.</p>
    </section>
  );
}
