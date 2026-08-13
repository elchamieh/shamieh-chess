import {
  formatClock,
  formatDateList,
  getCurrentMonthLabel,
  getPublicSessionSlots,
  type TrainingSessionRow,
} from "@/lib/training-schedule";

function ModeSchedule({
  rows,
  branch,
  mode,
}: {
  rows: TrainingSessionRow[];
  branch: string;
  mode: "live" | "online";
}) {
  const slots = getPublicSessionSlots(rows, branch, mode);
  if (!slots.length) return null;

  return (
    <div className={`public-schedule-mode public-schedule-${mode}`}>
      <div className="public-schedule-mode-heading">
        <div>
          <span className="public-schedule-icon" aria-hidden="true">{mode === "live" ? "♟" : "◉"}</span>
          <div>
            <b>{mode === "live" ? "Inside Academy" : "Online Classes"}</b>
            <span>Admin-published dates</span>
          </div>
        </div>
      </div>
      <div className="public-schedule-slots">
        {slots.map((slot) => (
          <div className="public-schedule-slot" key={`${slot.className}-${slot.startTime}-${slot.endTime}`}>
            <div>
              <span>{slot.level}</span>
              {slot.className !== slot.level ? <small>{slot.className}</small> : null}
            </div>
            <div className="public-schedule-slot-details">
              <b>{formatClock(slot.startTime)} – {formatClock(slot.endTime)}</b>
              <small>{formatDateList(slot.dates)}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicTrainingSchedule({ rows }: { rows: TrainingSessionRow[] }) {
  if (!rows.length) return null;
  const monthLabel = getCurrentMonthLabel();

  return (
    <section className="public-section public-training-schedule" id="schedule">
      <div className="public-section-heading">
        <span className="public-eyebrow">TRAINING SCHEDULE</span>
        <h2>{monthLabel} Training Dates</h2>
        <p>Exact dates and times are published by the academy for each class. Saida and Beirut are listed separately.</p>
      </div>

      <div className="public-schedule-branches">
        {(["Saida", "Beirut"] as const).map((branch, index) => {
          const branchRows = rows.filter((row) => row.class?.branch?.name === branch);
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
      <p className="public-schedule-note">The dates shown above are the official academy sessions published for the current month and may be updated by the administrator when needed.</p>
    </section>
  );
}
