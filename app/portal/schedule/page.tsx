import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import {
  formatClock,
  getBeirutIsoDate,
  getCurrentMonthBounds,
  getCurrentMonthLabel,
  getRemainingTrainingSessions,
  modeLabel,
  type TrainingSessionRow,
} from "@/lib/training-schedule";

export default async function StudentSchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, approved, frozen")
    .eq("id", user.id)
    .single();

  if (!profile?.approved || profile.role !== "student" || profile.frozen) redirect("/portal");

  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("class_id, class:classes(id, name, branch:branches(id, name), level:levels(id, name))")
    .eq("student_id", profile.id)
    .eq("active", true)
    .maybeSingle();

  const classInfo: any = enrollment?.class;
  const today = getBeirutIsoDate();
  const { last: monthEnd } = getCurrentMonthBounds();
  let scheduleRows: TrainingSessionRow[] = [];

  if (enrollment?.class_id) {
    const { data } = await supabase
      .from("training_sessions")
      .select("id, class_id, delivery_mode, session_date, start_time, end_time")
      .eq("class_id", enrollment.class_id)
      .eq("active", true)
      .gte("session_date", today)
      .lte("session_date", monthEnd)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true });
    scheduleRows = (data || []) as TrainingSessionRow[];
  }

  const sessions = getRemainingTrainingSessions(scheduleRows);
  const monthLabel = getCurrentMonthLabel();
  const uniqueDays = new Set(sessions.map((session) => session.date)).size;

  return (
    <PortalShell title="My Training Days" role="Student">
      <div className="nav" style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Student dashboard</Link>
      </div>

      <div className="grid">
        <div className="card span4">
          <div className="small">Remaining training days</div>
          <div className="kpi">{uniqueDays}</div>
          <div>{monthLabel}</div>
        </div>
        <div className="card span8">
          <h2>Your class</h2>
          {!enrollment ? (
            <p className="small">You have not been placed into an active class yet.</p>
          ) : (
            <>
              <h3 style={{ marginBottom: 6 }}>{classInfo?.name}</h3>
              <div className="small">{classInfo?.branch?.name} · {classInfo?.level?.name}</div>
              <p className="small" style={{ marginTop: 12, marginBottom: 0 }}>
                These are the exact training dates published by the academy for your class. If the administrator changes a session, this page updates automatically.
              </p>
            </>
          )}
        </div>

        <div className="card span12">
          <div className="row" style={{ paddingTop: 0 }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>{monthLabel}</h2>
              <div className="small">Only today and the remaining dates of this month are shown.</div>
            </div>
            {sessions.length ? <span className="pill">{sessions.length} session{sessions.length === 1 ? "" : "s"}</span> : null}
          </div>

          {!enrollment ? (
            <p className="small">Training dates will appear after the academy places you into a class.</p>
          ) : !scheduleRows.length ? (
            <p className="small">No remaining training dates have been published for your class this month.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 18 }}>
              {sessions.map((session) => (
                <article
                  className="card"
                  key={`${session.date}-${session.startTime}-${session.endTime}`}
                  style={{ boxShadow: "none", padding: 16, borderColor: session.modes[0] === "online" ? "#c9d8eb" : undefined }}
                >
                  <div className="small" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>{session.dateLabel}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, margin: "9px 0 12px" }}>
                    {formatClock(session.startTime)} – {formatClock(session.endTime)}
                  </div>
                  <span
                    className="pill"
                    style={session.modes.length > 1
                      ? { background: "#ece5d5", color: "#654b18" }
                      : session.modes[0] === "online"
                        ? { background: "#e4edf8", color: "#194f85" }
                        : undefined}
                  >
                    {modeLabel(session.modes)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
