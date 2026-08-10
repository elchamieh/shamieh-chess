import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { createStudent, moveStudent } from "./actions";

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ created?: string; moved?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/portal");

  const [{ data: students }, { data: classes }, { data: enrollments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "student").order("full_name"),
    supabase
      .from("classes")
      .select("id, name, branch:branches(name), level:levels(name, sort_order)")
      .eq("active", true)
      .order("name"),
    supabase
      .from("student_enrollments")
      .select("id, student_id, class_id, class:classes(name, branch:branches(name), level:levels(name))")
      .eq("active", true),
  ]);

  const enrollmentByStudent = new Map<string, any>();
  for (const enrollment of enrollments || []) enrollmentByStudent.set(enrollment.student_id, enrollment);

  return (
    <PortalShell title="Students" role="Admin">
      <div className="nav" style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      {params.created ? <div className="card" style={{ marginBottom: 18 }}><b>Student created and placed in class.</b></div> : null}
      {params.moved ? <div className="card" style={{ marginBottom: 18 }}><b>Student class updated.</b></div> : null}
      {params.error ? <div className="card" style={{ marginBottom: 18 }}><b>Could not complete action:</b> {decodeURIComponent(params.error)}</div> : null}

      <div className="grid">
        <div className="card span4">
          <h2>Create student</h2>
          <p className="small">The admin creates the login and places the student directly into one active class.</p>
          <form action={createStudent}>
            <label className="field">
              <span>Full name</span>
              <input className="input" name="full_name" required placeholder="Student name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input className="input" name="email" type="email" required placeholder="student@example.com" />
            </label>
            <label className="field">
              <span>Temporary password</span>
              <input className="input" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
            </label>
            <label className="field">
              <span>Class</span>
              <select className="input" name="class_id" required defaultValue="">
                <option value="" disabled>Select class</option>
                {(classes || []).map((item: any) => (
                  <option key={item.id} value={item.id}>{item.branch?.name} · {item.level?.name} · {item.name}</option>
                ))}
              </select>
            </label>
            <button className="btn" type="submit">Create student account</button>
          </form>
        </div>

        <div className="card span8">
          <h2>Student placement</h2>
          {!students?.length ? (
            <p className="small">No student accounts yet.</p>
          ) : (
            <div className="list">
              {students.map((student) => {
                const enrollment = enrollmentByStudent.get(student.id);
                const available = (classes || []).filter((item: any) => item.id !== enrollment?.class_id);
                return (
                  <div className="card" key={student.id} style={{ boxShadow: "none" }}>
                    <div className="row">
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{student.full_name}</h3>
                        {enrollment ? (
                          <div className="small">
                            Current class: <b>{enrollment.class?.branch?.name} · {enrollment.class?.level?.name} · {enrollment.class?.name}</b>
                          </div>
                        ) : (
                          <div className="small">No active class.</div>
                        )}
                      </div>
                    </div>

                    {available.length ? (
                      <form action={moveStudent} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "end" }}>
                        <input type="hidden" name="student_id" value={student.id} />
                        <label className="field" style={{ margin: 0, flex: 1 }}>
                          <span>{enrollment ? "Move to another class" : "Place in class"}</span>
                          <select className="input" name="class_id" required defaultValue="">
                            <option value="" disabled>Select class</option>
                            {available.map((item: any) => (
                              <option key={item.id} value={item.id}>{item.branch?.name} · {item.level?.name} · {item.name}</option>
                            ))}
                          </select>
                        </label>
                        <button className="btn" type="submit">{enrollment ? "Move" : "Place"}</button>
                      </form>
                    ) : null}
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
