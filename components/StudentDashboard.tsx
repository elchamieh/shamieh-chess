import PortalShell from "./PortalShell";
import { createClient } from "@/lib/supabase/server";

export default async function StudentDashboard({ profile }: { profile: any }) {
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("class_id, class:classes(id, name, branch:branches(name), level:levels(name))")
    .eq("student_id", profile.id)
    .eq("active", true)
    .maybeSingle();

  let coaches: any[] = [];
  let homework: any[] = [];

  if (enrollment?.class_id) {
    const [coachResult, homeworkResult] = await Promise.all([
      supabase
        .from("coach_class_assignments")
        .select("coach:profiles(id, full_name)")
        .eq("class_id", enrollment.class_id),
      supabase
        .from("homework")
        .select("id, title, instructions, attachment_url, due_date, created_at")
        .eq("class_id", enrollment.class_id)
        .eq("published", true)
        .order("created_at", { ascending: false }),
    ]);

    coaches = (coachResult.data || []).map((item: any) => item.coach).filter(Boolean);
    homework = homeworkResult.data || [];
  }

  const classInfo: any = enrollment?.class;

  return (
    <PortalShell title={`Welcome, ${profile.full_name}`} role="Student">
      <div className="grid">
        <div className="card span6">
          <h2>Your Class</h2>
          {!enrollment ? (
            <p className="small">You have not been placed into an active class yet.</p>
          ) : (
            <>
              <h3>{classInfo?.name}</h3>
              <div className="small">{classInfo?.branch?.name} · {classInfo?.level?.name}</div>
              <div style={{ marginTop: 14 }}>
                <b>{coaches.length === 1 ? "Coach" : "Coaches"}</b>
                {coaches.length ? (
                  <div className="small" style={{ marginTop: 6 }}>{coaches.map((coach) => coach.full_name).join(", ")}</div>
                ) : (
                  <div className="small" style={{ marginTop: 6 }}>No coach assigned yet.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="card span6">
          <h2>Homework</h2>
          {!enrollment ? (
            <p className="small">Homework will appear after class placement.</p>
          ) : !homework.length ? (
            <p className="small">No homework assigned yet.</p>
          ) : (
            <div className="list">
              {homework.map((item) => (
                <div className="card" key={item.id} style={{ boxShadow: "none" }}>
                  <b>{item.title}</b>
                  {item.due_date ? <div className="small" style={{ marginTop: 4 }}>Due {item.due_date}</div> : null}
                  {item.instructions ? <p>{item.instructions}</p> : null}
                  {item.attachment_url ? (
                    <a className="btn secondary" href={item.attachment_url} target="_blank" rel="noreferrer">Open resource</a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card span12">
          <h2>Upcoming Tournaments</h2>
          <p className="small">Tournament registration is the next module to activate. Once enabled, open events and your registration status will appear here.</p>
        </div>
      </div>
    </PortalShell>
  );
}
