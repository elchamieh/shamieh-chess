import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { formatClock, getBeirutIsoDate, getCurrentMonthLabel } from "@/lib/training-schedule";
import { saveAttendance } from "./actions";

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00Z`));
}

function errorMessage(code?: string) {
  if (code === "missing-session") return "Choose a training session first.";
  if (code === "invalid-session") return "Attendance can only be marked for an active session that is today or earlier.";
  if (code === "not-assigned") return "This class is not assigned to your coach account.";
  if (code === "no-students") return "There are no active students in this class.";
  if (code === "incomplete") return "Please choose an attendance status for every student.";
  if (code === "save-failed") return "Attendance could not be saved. Please try again.";
  return "";
}

export default async function CoachAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, approved, frozen")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coach" || profile?.approved !== true || profile?.frozen === true) redirect("/portal");

  const { data: assignments } = await supabase
    .from("coach_class_assignments")
    .select("class_id")
    .eq("coach_id", user.id);

  const classIds = (assignments || []).map((item) => item.class_id);
  const today = getBeirutIsoDate();
  const monthStart = `${today.slice(0, 7)}-01`;

  let sessions: any[] = [];
  if (classIds.length) {
    const { data } = await supabase
      .from("training_sessions")
      .select("id, class_id, delivery_mode, session_date, start_time, end_time, class:classes(id, name, branch:branches(name), level:levels(name))")
      .in("class_id", classIds)
      .eq("active", true)
      .gte("session_date", monthStart)
      .lte("session_date", today)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false });
    sessions = data || [];
  }

  const selectedSession = sessions.find((item) => item.id === params.session) || sessions[0] || null;
  let students: any[] = [];
  let attendance: any[] = [];

  if (selectedSession) {
    const [{ data: enrollmentRows }, { data: attendanceRows }] = await Promise.all([
      supabase
        .from("student_enrollments")
        .select("student_id, student:profiles(id, full_name, approved, frozen)")
        .eq("class_id", selectedSession.class_id)
        .eq("active", true),
      supabase
        .from("attendance_records")
        .select("student_id, status, marked_at, marked_by")
        .eq("training_session_id", selectedSession.id),
    ]);

    students = (enrollmentRows || [])
      .map((item: any) => item.student)
      .filter((student: any) => student?.approved === true && student?.frozen !== true)
      .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
    attendance = attendanceRows || [];
  }

  const attendanceByStudent = new Map(attendance.map((item: any) => [item.student_id, item]));
  const markedCount = attendance.length;
  const selectedClass: any = selectedSession?.class;
  const error = errorMessage(params.error);

  return (
    <PortalShell title="Attendance" role="Coach">
      <div style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn secondary" href="/portal">← Coach dashboard</Link>
      </div>

      {params.saved ? <div className="public-alert public-alert-success">Attendance saved successfully.</div> : null}
      {error ? <div className="public-alert public-alert-error">{error}</div> : null}

      <div className="grid">
        <div className="card span4">
          <h2>{getCurrentMonthLabel()}</h2>
          <p className="small">Choose one of your completed or current training sessions. Future sessions are not available for attendance yet.</p>
          {!sessions.length ? (
            <p className="small">No training sessions are available for attendance this month.</p>
          ) : (
            <div className="list">
              {sessions.map((session: any) => {
                const item: any = session.class;
                const selected = selectedSession?.id === session.id;
                return (
                  <Link
                    key={session.id}
                    href={`/portal/coach/attendance?session=${session.id}`}
                    className="card"
                    style={{
                      boxShadow: "none",
                      padding: 14,
                      borderColor: selected ? "#183c2d" : undefined,
                      background: selected ? "#f0f5f2" : undefined,
                    }}
                  >
                    <b>{formatSessionDate(session.session_date)} · {formatClock(session.start_time)}</b>
                    <div className="small" style={{ marginTop: 5 }}>{item?.branch?.name} · {item?.name}</div>
                    <div className="small">{session.delivery_mode === "online" ? "Online" : "Inside Academy"}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="card span8">
          {!selectedSession ? (
            <>
              <h2>Take attendance</h2>
              <p className="small">Once a training session is available, select it here to mark the class roster.</p>
            </>
          ) : (
            <>
              <div className="row" style={{ paddingTop: 0, alignItems: "flex-start" }}>
                <div>
                  <div className="small">{selectedClass?.branch?.name} · {selectedClass?.level?.name}</div>
                  <h2 style={{ margin: "6px 0" }}>{selectedClass?.name}</h2>
                  <div>{formatSessionDate(selectedSession.session_date)} · {formatClock(selectedSession.start_time)}–{formatClock(selectedSession.end_time)}</div>
                  <div className="small" style={{ marginTop: 4 }}>{selectedSession.delivery_mode === "online" ? "Online" : "Inside Academy"}</div>
                </div>
                <span className="pill">{markedCount}/{students.length} marked</span>
              </div>

              {!students.length ? (
                <p className="small">No active students are currently enrolled in this class.</p>
              ) : (
                <form action={saveAttendance}>
                  <input type="hidden" name="training_session_id" value={selectedSession.id} />
                  <div className="list" style={{ marginTop: 10 }}>
                    {students.map((student: any) => {
                      const record: any = attendanceByStudent.get(student.id);
                      const currentStatus = record?.status || "present";
                      return (
                        <div className="row" key={student.id} style={{ alignItems: "center" }}>
                          <div>
                            <b>{student.full_name}</b>
                            <div className="small">{record ? `Previously marked ${record.status}` : "Default: Present"}</div>
                          </div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {([
                              ["present", "Present"],
                              ["absent", "Absent"],
                              ["excused", "Excused"],
                            ] as const).map(([value, label]) => (
                              <label key={value} style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                                <input
                                  type="radio"
                                  name={`status_${student.id}`}
                                  value={value}
                                  defaultChecked={currentStatus === value}
                                />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="btn" type="submit" style={{ marginTop: 18 }}>Save attendance</button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
