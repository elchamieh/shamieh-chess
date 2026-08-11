import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import AdminStudentAccountActions from "@/components/AdminStudentAccountActions";
import { createClient } from "@/lib/supabase/server";
import { approveStudent, createStudent, moveStudent } from "./actions";

function formatBirthDate(value: string | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; moved?: string; approved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, approved, frozen")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" || profile?.approved !== true || profile?.frozen === true) redirect("/portal");

  const [studentsResult, pendingResult, classesResult, enrollmentsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, date_of_birth, fide_id, frozen, frozen_at").eq("role", "student").eq("approved", true).order("full_name"),
    supabase.from("profiles").select("id, full_name, date_of_birth, fide_id, created_at").eq("role", "student").eq("approved", false).order("created_at"),
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

  const students = studentsResult.data || [];
  const pendingStudents = pendingResult.data || [];
  const classes = classesResult.data || [];
  const enrollments = enrollmentsResult.data || [];

  const enrollmentByStudent = new Map<string, any>();
  for (const enrollment of enrollments) enrollmentByStudent.set(enrollment.student_id, enrollment);

  return (
    <PortalShell title="Students" role="Admin">
      <div className="nav" style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      {params.created ? <div className="card" style={{ marginBottom: 18 }}><b>Student created and placed in class.</b></div> : null}
      {params.approved ? <div className="card" style={{ marginBottom: 18 }}><b>Registration approved and student placed in class.</b></div> : null}
      {params.moved ? <div className="card" style={{ marginBottom: 18 }}><b>Student class updated.</b></div> : null}
      {params.error ? <div className="card" style={{ marginBottom: 18 }}><b>Could not complete action:</b> {decodeURIComponent(params.error)}</div> : null}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row">
          <div>
            <h2 style={{ marginBottom: 4 }}>Pending registrations</h2>
            <div className="small">Students who register themselves appear here. Review their date of birth and optional FIDE ID, then choose their class.</div>
          </div>
          <span className="pill">{pendingStudents.length} pending</span>
        </div>

        {!pendingStudents.length ? (
          <p className="small">No pending student registrations.</p>
        ) : (
          <div className="list">
            {pendingStudents.map((student: any) => (
              <div className="card" key={student.id} style={{ boxShadow: "none" }}>
                <div>
                  <h3 style={{ marginBottom: 6 }}>{student.full_name}</h3>
                  <div className="small">Date of birth: <b>{formatBirthDate(student.date_of_birth)}</b></div>
                  <div className="small">FIDE ID: <b>{student.fide_id || "Not provided"}</b></div>
                  <div className="small" style={{ marginTop: 4 }}>Registered {new Date(student.created_at).toLocaleDateString("en-GB")}</div>
                </div>
                <form action={approveStudent} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                  <input type="hidden" name="student_id" value={student.id} />
                  <label className="field" style={{ margin: 0, flex: 1, minWidth: 240 }}>
                    <span>Approve into class</span>
                    <select className="input" name="class_id" required defaultValue="">
                      <option value="" disabled>Select class</option>
                      {classes.map((item: any) => (
                        <option key={item.id} value={item.id}>{item.branch?.name} · {item.level?.name} · {item.name}</option>
                      ))}
                    </select>
                  </label>
                  <button className="btn" type="submit">Approve & place</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid">
        <div className="card span4">
          <h2>Create student manually</h2>
          <p className="small">Admin-created students are approved immediately and placed directly into a class.</p>
          <form action={createStudent}>
            <label className="field">
              <span>Full name</span>
              <input className="input" name="full_name" required placeholder="Student name" />
            </label>
            <label className="field">
              <span>Date of birth</span>
              <input className="input" name="date_of_birth" type="date" required />
            </label>
            <label className="field">
              <span>FIDE ID <span className="small">(optional)</span></span>
              <input className="input" name="fide_id" maxLength={32} placeholder="e.g. 1234567" />
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
                {classes.map((item: any) => (
                  <option key={item.id} value={item.id}>{item.branch?.name} · {item.level?.name} · {item.name}</option>
                ))}
              </select>
            </label>
            <button className="btn" type="submit">Create student account</button>
          </form>
        </div>

        <div className="card span8">
          <h2>Approved students</h2>
          <p className="small">Freeze keeps the student's records and class placement. Delete permanently removes the student account.</p>
          {!students.length ? (
            <p className="small">No approved student accounts yet.</p>
          ) : (
            <div className="list">
              {students.map((student: any) => {
                const enrollment = enrollmentByStudent.get(student.id);
                const available = classes.filter((item: any) => item.id !== enrollment?.class_id);
                return (
                  <div className="card" key={student.id} style={{ boxShadow: "none" }}>
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{student.full_name}</h3>
                        <div className="small">Date of birth: <b>{formatBirthDate(student.date_of_birth)}</b></div>
                        <div className="small">FIDE ID: <b>{student.fide_id || "Not provided"}</b></div>
                        {enrollment ? (
                          <div className="small" style={{ marginTop: 4 }}>
                            Current class: <b>{enrollment.class?.branch?.name} · {enrollment.class?.level?.name} · {enrollment.class?.name}</b>
                          </div>
                        ) : (
                          <div className="small" style={{ marginTop: 4 }}>No active class.</div>
                        )}
                      </div>
                      <span className="pill">{student.frozen ? "Frozen" : "Active"}</span>
                    </div>

                    {available.length ? (
                      <form action={moveStudent} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                        <input type="hidden" name="student_id" value={student.id} />
                        <label className="field" style={{ margin: 0, flex: 1, minWidth: 220 }}>
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

                    <AdminStudentAccountActions
                      studentId={student.id}
                      studentName={student.full_name}
                      frozen={Boolean(student.frozen)}
                    />
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
