import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function AdminHomeworkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile?.approved !== true) redirect("/portal");

  const [{ data: classes }, { data: enrollments }, { data: homework }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, branch:branches(name), level:levels(name)")
      .eq("active", true)
      .order("name"),
    supabase
      .from("student_enrollments")
      .select("class_id, student:profiles(id, full_name)")
      .eq("active", true),
    supabase
      .from("homework")
      .select("id, class_id, title, instructions, attachment_url, due_date, created_at, published, class:classes(id, name, branch:branches(name), level:levels(name))")
      .order("created_at", { ascending: false }),
  ]);

  const studentsByClass = new Map<string, any[]>();
  for (const enrollment of enrollments || []) {
    const list = studentsByClass.get(enrollment.class_id) || [];
    if (enrollment.student) list.push(enrollment.student);
    studentsByClass.set(enrollment.class_id, list);
  }

  return (
    <PortalShell title="Homework" role="Admin">
      <div style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      <div className="grid">
        <div className="card span5">
          <h2>Classes & students</h2>
          <p className="small">The same class rosters visible to coaches, shown here across the whole academy.</p>
          {!classes?.length ? (
            <p className="small">No active classes yet.</p>
          ) : (
            <div className="list">
              {classes.map((item: any) => {
                const students = studentsByClass.get(item.id) || [];
                return (
                  <div className="card" key={item.id} style={{ boxShadow: "none" }}>
                    <h3 style={{ marginBottom: 6 }}>{item.name}</h3>
                    <div className="small">
                      {item.branch?.name} · {item.level?.name} · {students.length} student{students.length === 1 ? "" : "s"}
                    </div>
                    {!students.length ? (
                      <div className="small" style={{ marginTop: 10 }}>No students currently placed in this class.</div>
                    ) : (
                      <div className="list" style={{ gap: 4, marginTop: 10 }}>
                        {students.map((student: any) => (
                          <div className="small" key={student.id}>• {student.full_name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card span7">
          <h2>Homework overview</h2>
          <p className="small">See homework published by coaches and every student currently assigned to receive it.</p>
          {!homework?.length ? (
            <p className="small">No homework posted yet.</p>
          ) : (
            <div className="list">
              {homework.map((item: any) => {
                const students = studentsByClass.get(item.class_id) || [];
                return (
                  <div className="card" key={item.id} style={{ boxShadow: "none" }}>
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{item.title}</h3>
                        <div className="small">
                          {item.class?.branch?.name} · {item.class?.level?.name} · {item.class?.name}
                        </div>
                        <div className="small" style={{ marginTop: 4 }}>
                          Posted {formatDate(item.created_at)}{item.due_date ? ` · Due ${item.due_date}` : ""}
                        </div>
                      </div>
                      <span className="pill">{students.length} assigned</span>
                    </div>

                    {item.instructions ? <p>{item.instructions}</p> : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {item.attachment_url ? (
                        <a className="btn secondary" href={item.attachment_url} target="_blank" rel="noreferrer">Open resource</a>
                      ) : null}
                      <span className="pill">{item.published ? "Published" : "Draft"}</span>
                    </div>

                    <details style={{ marginTop: 14 }}>
                      <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                        Students receiving this homework ({students.length})
                      </summary>
                      {!students.length ? (
                        <div className="small" style={{ marginTop: 8 }}>No active students are currently in this class.</div>
                      ) : (
                        <div className="list" style={{ gap: 4, marginTop: 8 }}>
                          {students.map((student: any) => (
                            <div className="small" key={student.id}>• {student.full_name}</div>
                          ))}
                        </div>
                      )}
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
