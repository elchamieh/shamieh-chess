import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import AdminStudentAccountActions from "@/components/AdminStudentAccountActions";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/access";
import { approveStudent, createStudent, moveStudent } from "./actions";

function formatBirthDate(value: string | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatRegisteredDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Beirut" }).format(new Date(value));
}

function classLabel(item: any) {
  return [item.branch?.name, item.level?.name, item.name].filter(Boolean).join(" · ");
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
    .select("full_name, role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();
  if (!hasAdminAccess(profile)) redirect("/portal");

  const [studentsResult, pendingResult, classesResult, enrollmentsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, date_of_birth, fide_id, phone, created_at, frozen, frozen_at").eq("role", "student").eq("approved", true).order("full_name"),
    supabase.from("profiles").select("id, full_name, date_of_birth, fide_id, phone, created_at, preferred_branch:branches(name)").eq("role", "student").eq("approved", false).order("created_at"),
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

  const sortedClasses = [...classes].sort((a: any, b: any) => {
    const branchCompare = String(a.branch?.name || "").localeCompare(String(b.branch?.name || ""));
    if (branchCompare) return branchCompare;
    const levelCompare = Number(a.level?.sort_order || 0) - Number(b.level?.sort_order || 0);
    if (levelCompare) return levelCompare;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  const studentsByClass = new Map<string, any[]>();
  for (const item of sortedClasses) studentsByClass.set(item.id, []);

  const unassignedStudents: any[] = [];
  for (const student of students) {
    const enrollment = enrollmentByStudent.get(student.id);
    const bucket = enrollment?.class_id ? studentsByClass.get(enrollment.class_id) : null;
    if (bucket) bucket.push(student);
    else unassignedStudents.push(student);
  }

  function renderStudentCard(student: any) {
    const enrollment = enrollmentByStudent.get(student.id);
    const available = sortedClasses.filter((item: any) => item.id !== enrollment?.class_id);

    return (
      <div className="card" key={student.id} style={{ boxShadow: "none" }}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div>
            <h3 style={{ marginBottom: 6 }}>{student.full_name}</h3>
            <div className="small">Date of birth: <b>{formatBirthDate(student.date_of_birth)}</b></div>
            <div className="small">FIDE ID: <b>{student.fide_id || "Not provided"}</b></div>
            <div className="small">Phone: <b>{student.phone || "Not provided"}</b></div>
            <div className="small">Registered: <b>{formatRegisteredDate(student.created_at)}</b></div>
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
                  <option key={item.id} value={item.id}>{classLabel(item)}</option>
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
  }

  return (
    <PortalShell title="Students" role="Admin">
      <div className="nav" style={{ marginBottom: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
        <a className="btn" href="/portal/admin/students/export">Export Excel</a>
      </div>

      {params.created ? <div className="card" style={{ marginBottom: 18 }}><b>Student created and placed in class.</b></div> : null}
      {params.approved ? <div className="card" style={{ marginBottom: 18 }}><b>Registration approved and student placed in class.</b></div> : null}
      {params.moved ? <div className="card" style={{ marginBottom: 18 }}><b>Student class updated.</b></div> : null}
      {params.error ? <div className="card" style={{ marginBottom: 18 }}><b>Could not complete action:</b> {decodeURIComponent(params.error)}</div> : null}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row">
          <div>
            <h2 style={{ marginBottom: 4 }}>Pending registrations</h2>
            <div className="small">Students who register themselves appear here. Review their preferred location and details, then choose their class.</div>
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
                  <div className="small">Preferred location: <b>{student.preferred_branch?.name || "Not selected"}</b></div>
                  <div className="small">Date of birth: <b>{formatBirthDate(student.date_of_birth)}</b></div>
                  <div className="small">FIDE ID: <b>{student.fide_id || "Not provided"}</b></div>
                  <div className="small">Phone: <b>{student.phone || "Not provided"}</b></div>
                  <div className="small" style={{ marginTop: 4 }}>Registered {formatRegisteredDate(student.created_at)}</div>
                </div>
                <form action={approveStudent} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                  <input type="hidden" name="student_id" value={student.id} />
                  <label className="field" style={{ margin: 0, flex: 1, minWidth: 240 }}>
                    <span>Approve into class</span>
                    <select className="input" name="class_id" required defaultValue="">
                      <option value="" disabled>Select class</option>
                      {sortedClasses.map((item: any) => (
                        <option key={item.id} value={item.id}>{classLabel(item)}</option>
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
              <span>Phone number <span className="small">(optional)</span></span>
              <input className="input" name="phone" type="tel" maxLength={32} placeholder="e.g. +961 3 123 456" />
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
                {sortedClasses.map((item: any) => (
                  <option key={item.id} value={item.id}>{classLabel(item)}</option>
                ))}
              </select>
            </label>
            <button className="btn" type="submit">Create student account</button>
          </form>
        </div>

        <div className="card span8">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>Approved students by class</h2>
              <p className="small" style={{ marginTop: 0 }}>
                Click a class to see its students. Freeze keeps records and class placement; delete permanently removes the student account.
              </p>
            </div>
            <span className="pill">{students.length} students</span>
          </div>

          {!students.length ? (
            <p className="small">No approved student accounts yet.</p>
          ) : (
            <div className="list">
              {sortedClasses.map((item: any) => {
                const classStudents = studentsByClass.get(item.id) || [];
                return (
                  <details className="card" key={item.id} style={{ boxShadow: "none" }}>
                    <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                      {classLabel(item)} <span className="small">({classStudents.length})</span>
                    </summary>
                    <div className="list" style={{ marginTop: 14 }}>
                      {classStudents.length ? classStudents.map(renderStudentCard) : <div className="small">No students in this class.</div>}
                    </div>
                  </details>
                );
              })}

              {unassignedStudents.length ? (
                <details className="card" style={{ boxShadow: "none" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                    Unassigned students <span className="small">({unassignedStudents.length})</span>
                  </summary>
                  <div className="list" style={{ marginTop: 14 }}>
                    {unassignedStudents.map(renderStudentCard)}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
