import PortalShell from "./PortalShell";
import { createClient } from "@/lib/supabase/server";
import { createHomework } from "@/app/portal/coach/actions";

export default async function CoachDashboard({ profile }: { profile: any }) {
  const supabase = await createClient();

  const [{ data: assignments }, { data: enrollments }, { data: homework }] = await Promise.all([
    supabase
      .from("coach_class_assignments")
      .select("class_id, class:classes(id, name, branch:branches(name), level:levels(name))")
      .eq("coach_id", profile.id),
    supabase
      .from("student_enrollments")
      .select("class_id, student:profiles(id, full_name)")
      .eq("active", true),
    supabase
      .from("homework")
      .select("id, class_id, title, instructions, attachment_url, due_date, created_at, class:classes(name)")
      .order("created_at", { ascending: false }),
  ]);

  const studentsByClass = new Map<string, any[]>();
  for (const enrollment of enrollments || []) {
    const list = studentsByClass.get(enrollment.class_id) || [];
    list.push(enrollment.student);
    studentsByClass.set(enrollment.class_id, list);
  }

  return (
    <PortalShell title={`Welcome, Coach ${profile.full_name}`} role="Coach">
      <div className="grid">
        <div className="card span8">
          <h2>My Classes</h2>
          {!assignments?.length ? (
            <p className="small">No classes are assigned to your account yet.</p>
          ) : (
            <div className="list">
              {assignments.map((assignment: any) => {
                const item = assignment.class;
                const students = studentsByClass.get(assignment.class_id) || [];
                return (
                  <div className="card" key={assignment.class_id} style={{ boxShadow: "none" }}>
                    <div className="row">
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{item?.name}</h3>
                        <div className="small">{item?.branch?.name} · {item?.level?.name} · {students.length} students</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <b>Roster</b>
                      {!students.length ? (
                        <p className="small">No students currently placed in this class.</p>
                      ) : (
                        <div className="list" style={{ gap: 4, marginTop: 6 }}>
                          {students.map((student: any) => (
                            <div className="small" key={student?.id}>• {student?.full_name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card span4">
          <h2>Create Homework</h2>
          <p className="small">Homework is visible only to students in the selected assigned class.</p>
          {!assignments?.length ? (
            <p className="small">A class must be assigned before you can create homework.</p>
          ) : (
            <form action={createHomework}>
              <label className="field">
                <span>Class</span>
                <select className="input" name="class_id" required defaultValue="">
                  <option value="" disabled>Select class</option>
                  {assignments.map((assignment: any) => (
                    <option key={assignment.class_id} value={assignment.class_id}>
                      {assignment.class?.branch?.name} · {assignment.class?.level?.name} · {assignment.class?.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Title</span>
                <input className="input" name="title" required placeholder="Homework title" />
              </label>
              <label className="field">
                <span>Instructions</span>
                <textarea className="input" name="instructions" rows={4} placeholder="What should students do?" />
              </label>
              <label className="field">
                <span>Due date</span>
                <input className="input" name="due_date" type="date" />
              </label>
              <label className="field">
                <span>Resource link</span>
                <input className="input" name="attachment_url" type="url" placeholder="https://..." />
              </label>
              <button className="btn" type="submit">Publish homework</button>
            </form>
          )}
        </div>

        <div className="card span12">
          <h2>Recent Homework</h2>
          {!homework?.length ? (
            <p className="small">No homework posted yet.</p>
          ) : (
            <div className="list">
              {homework.map((item: any) => (
                <div className="row" key={item.id}>
                  <div>
                    <b>{item.title}</b>
                    <div className="small">
                      {item.class?.name}{item.due_date ? ` · Due ${item.due_date}` : ""}
                    </div>
                    {item.instructions ? <div style={{ marginTop: 6 }}>{item.instructions}</div> : null}
                  </div>
                  {item.attachment_url ? (
                    <a className="btn secondary" href={item.attachment_url} target="_blank" rel="noreferrer">Open resource</a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
