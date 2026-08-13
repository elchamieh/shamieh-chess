import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { formatClock, getBeirutIsoDate } from "@/lib/training-schedule";

function validMonth(value?: string) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : getBeirutIsoDate().slice(0, 7);
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T12:00:00Z`));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatMarkedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, approved")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile?.approved !== true) redirect("/portal");

  const month = validMonth(params.month);
  const today = getBeirutIsoDate();
  const end = month === today.slice(0, 7) ? today : monthEnd(month);

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("id, class_id, delivery_mode, session_date, start_time, end_time, class:classes(id, name, branch:branches(name), level:levels(name))")
    .eq("active", true)
    .gte("session_date", `${month}-01`)
    .lte("session_date", end)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false });

  const sessionIds = (sessions || []).map((session) => session.id);
  const classIds = [...new Set((sessions || []).map((session) => session.class_id))];

  let records: any[] = [];
  let enrollments: any[] = [];
  if (sessionIds.length) {
    const { data } = await supabase
      .from("attendance_records")
      .select("id, training_session_id, student_id, status, marked_by, marked_at")
      .in("training_session_id", sessionIds)
      .order("marked_at", { ascending: false });
    records = data || [];
  }
  if (classIds.length) {
    const { data } = await supabase
      .from("student_enrollments")
      .select("class_id, student_id")
      .in("class_id", classIds)
      .eq("active", true);
    enrollments = data || [];
  }

  const profileIds = [...new Set(records.flatMap((record) => [record.student_id, record.marked_by]))];
  let people: any[] = [];
  if (profileIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    people = data || [];
  }

  const nameById = new Map(people.map((person) => [person.id, person.full_name]));
  const recordsBySession = new Map<string, any[]>();
  for (const record of records) {
    const list = recordsBySession.get(record.training_session_id) || [];
    list.push(record);
    recordsBySession.set(record.training_session_id, list);
  }

  const expectedByClass = new Map<string, number>();
  for (const enrollment of enrollments) {
    expectedByClass.set(enrollment.class_id, (expectedByClass.get(enrollment.class_id) || 0) + 1);
  }

  const present = records.filter((record) => record.status === "present").length;
  const absent = records.filter((record) => record.status === "absent").length;
  const excused = records.filter((record) => record.status === "excused").length;
  const sessionsMarked = (sessions || []).filter((session) => (recordsBySession.get(session.id) || []).length > 0).length;

  return (
    <PortalShell title="Attendance" role="Admin">
      <div style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "end", marginLeft: "auto" }}>
          <label className="field" style={{ margin: 0 }}>
            <span className="small">Month</span>
            <input className="input" type="month" name="month" defaultValue={month} />
          </label>
          <button className="btn secondary" type="submit">View</button>
        </form>
      </div>

      <div className="grid">
        <div className="card span4">
          <div className="small">Sessions with attendance</div>
          <div className="kpi">{sessionsMarked}/{sessions?.length || 0}</div>
          <div>{monthLabel(month)}</div>
        </div>
        <div className="card span4">
          <div className="small">Present</div>
          <div className="kpi">{present}</div>
          <div>{absent} absent</div>
        </div>
        <div className="card span4">
          <div className="small">Excused</div>
          <div className="kpi">{excused}</div>
          <div>{records.length} attendance records</div>
        </div>

        <div className="card span12">
          <h2>{monthLabel(month)} class attendance</h2>
          {!sessions?.length ? (
            <p className="small">No completed training sessions were found for this month.</p>
          ) : (
            <div className="list">
              {sessions.map((session: any) => {
                const classInfo: any = session.class;
                const sessionRecords = recordsBySession.get(session.id) || [];
                const expected = expectedByClass.get(session.class_id) || 0;
                const p = sessionRecords.filter((record) => record.status === "present").length;
                const a = sessionRecords.filter((record) => record.status === "absent").length;
                const e = sessionRecords.filter((record) => record.status === "excused").length;
                const markerNames = [...new Set(sessionRecords.map((record) => nameById.get(record.marked_by)).filter(Boolean))];

                return (
                  <details className="card" key={session.id} style={{ boxShadow: "none" }}>
                    <summary style={{ cursor: "pointer", listStyle: "none" }}>
                      <div className="row" style={{ padding: 0, borderBottom: 0 }}>
                        <div>
                          <b>{formatDate(session.session_date)} · {formatClock(session.start_time)}–{formatClock(session.end_time)}</b>
                          <div className="small" style={{ marginTop: 5 }}>
                            {classInfo?.branch?.name} · {classInfo?.level?.name} · {classInfo?.name} · {session.delivery_mode === "online" ? "Online" : "Inside Academy"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {sessionRecords.length ? (
                            <>
                              <span className="pill">{p} P · {a} A · {e} E</span>
                              <div className="small" style={{ marginTop: 5 }}>{sessionRecords.length}/{expected || sessionRecords.length} marked</div>
                            </>
                          ) : (
                            <span className="pill" style={{ background: "#f6e6e3", color: "#7e2f29" }}>Not marked</span>
                          )}
                        </div>
                      </div>
                    </summary>

                    <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                      {!sessionRecords.length ? (
                        <p className="small">The coach has not submitted attendance for this session yet.</p>
                      ) : (
                        <>
                          {markerNames.length ? <div className="small" style={{ marginBottom: 8 }}>Marked by: {markerNames.join(", ")}</div> : null}
                          <div className="list" style={{ gap: 4 }}>
                            {sessionRecords
                              .slice()
                              .sort((x, y) => String(nameById.get(x.student_id) || "").localeCompare(String(nameById.get(y.student_id) || "")))
                              .map((record) => (
                                <div className="row" key={record.id}>
                                  <div>
                                    <b>{nameById.get(record.student_id) || "Student"}</b>
                                    <div className="small">Updated {formatMarkedAt(record.marked_at)}</div>
                                  </div>
                                  <span className="pill" style={
                                    record.status === "absent"
                                      ? { background: "#f6e6e3", color: "#7e2f29" }
                                      : record.status === "excused"
                                        ? { background: "#ece5d5", color: "#654b18" }
                                        : undefined
                                  }>
                                    {record.status === "present" ? "Present" : record.status === "absent" ? "Absent" : "Excused"}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
