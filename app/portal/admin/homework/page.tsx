import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import CoachHomeworkForm from "@/components/CoachHomeworkForm";
import DeleteHomeworkButton from "@/components/DeleteHomeworkButton";
import { createClient } from "@/lib/supabase/server";
import { createHomeworkDownloadUrl } from "@/lib/homework-files";
import { hasAdminAccess } from "@/lib/access";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminHomeworkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();

  if (!hasAdminAccess(profile)) redirect("/portal");

  const [
    { data: classes },
    { data: enrollments },
    { data: homework },
    { data: submissions },
    { data: chessAttempts },
  ] = await Promise.all([
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
      .select("id, class_id, title, instructions, attachment_url, attachment_path, attachment_name, due_date, created_at, published, created_by, interactive_position_fen, class:classes(id, name, branch:branches(name), level:levels(name))")
      .order("created_at", { ascending: false }),
    supabase
      .from("homework_submissions")
      .select("id, homework_id, student_id, file_path, file_name, submitted_at, student:profiles(id, full_name)")
      .order("submitted_at", { ascending: false }),
    supabase
      .from("homework_chess_attempts")
      .select("homework_id, student_id, solved, mistakes, solved_at, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const studentsByClass = new Map<string, any[]>();
  for (const enrollment of enrollments || []) {
    const list = studentsByClass.get(enrollment.class_id) || [];
    if (enrollment.student) list.push(enrollment.student);
    studentsByClass.set(enrollment.class_id, list);
  }

  const classOptions = (classes || []).map((item: any) => ({
    id: item.id,
    label: `${item.branch?.name || ""} · ${item.level?.name || ""} · ${item.name || "Class"}`,
  }));

  const homeworkWithDownloads = await Promise.all((homework || []).map(async (item: any) => ({
    ...item,
    attachment_download_url: await createHomeworkDownloadUrl(supabase, item.attachment_path),
  })));

  const submissionsWithDownloads = await Promise.all((submissions || []).map(async (item: any) => ({
    ...item,
    download_url: await createHomeworkDownloadUrl(supabase, item.file_path),
  })));

  const submissionsByHomework = new Map<string, any[]>();
  for (const submission of submissionsWithDownloads) {
    const list = submissionsByHomework.get(submission.homework_id) || [];
    list.push(submission);
    submissionsByHomework.set(submission.homework_id, list);
  }

  const chessAttemptsByHomework = new Map<string, any[]>();
  for (const attempt of chessAttempts || []) {
    const list = chessAttemptsByHomework.get(attempt.homework_id) || [];
    list.push(attempt);
    chessAttemptsByHomework.set(attempt.homework_id, list);
  }

  return (
    <PortalShell title="Homework" role="Admin">
      <div style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      <div className="grid">
        <div className="card span5">
          <h2>Create Homework</h2>
          <p className="small">Choose any active class and publish homework directly to its students. Add instructions, a due date, a PDF/Word file, a resource link, an interactive chess position, or any combination of them.</p>
          {!classOptions.length ? (
            <p className="small">Create an active class before publishing homework.</p>
          ) : (
            <CoachHomeworkForm classes={classOptions} />
          )}
        </div>

        <div className="card span7">
          <h2>Classes & students</h2>
          <p className="small">All active class rosters across the academy. Use these rosters to confirm who will receive each assignment.</p>
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

        <div className="card span12">
          <h2>Homework & student work</h2>
          <p className="small">Review files and interactive chess results together. Chess exercises show solved status and mistake count per student.</p>
          {!homeworkWithDownloads.length ? (
            <p className="small">No homework posted yet.</p>
          ) : (
            <div className="list">
              {homeworkWithDownloads.map((item: any) => {
                const students = studentsByClass.get(item.class_id) || [];
                const itemSubmissions = submissionsByHomework.get(item.id) || [];
                const itemChessAttempts = chessAttemptsByHomework.get(item.id) || [];
                const submissionByStudent = new Map(itemSubmissions.map((submission: any) => [submission.student_id, submission]));
                const attemptByStudent = new Map(itemChessAttempts.map((attempt: any) => [attempt.student_id, attempt]));
                const solvedCount = itemChessAttempts.filter((attempt: any) => attempt.solved).length;
                const hasInteractive = Boolean(item.interactive_position_fen);
                const hasFileWork = Boolean(item.attachment_path || item.attachment_url);
                const createdByAdmin = item.created_by === user.id;

                return (
                  <div className="card" key={item.id} style={{ boxShadow: "none" }}>
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{item.title}</h3>
                        <div className="small">
                          {item.class?.branch?.name} · {item.class?.level?.name} · {item.class?.name}
                        </div>
                        <div className="small" style={{ marginTop: 4 }}>
                          Posted {formatDate(item.created_at)}{item.due_date ? ` · Due ${item.due_date}` : ""}{createdByAdmin ? " · Created by you" : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                        {hasInteractive ? <span className="pill">{solvedCount}/{students.length} chess solved</span> : null}
                        {hasFileWork ? <span className="pill">{itemSubmissions.length}/{students.length} files</span> : null}
                        <DeleteHomeworkButton homeworkId={item.id} />
                      </div>
                    </div>

                    {item.instructions ? <p>{item.instructions}</p> : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {item.attachment_download_url ? (
                        <a className="btn secondary" href={item.attachment_download_url}>Download {item.attachment_name || "homework file"}</a>
                      ) : null}
                      {item.attachment_url ? (
                        <a className="btn secondary" href={item.attachment_url} target="_blank" rel="noreferrer">Open resource link</a>
                      ) : null}
                      {hasInteractive ? <span className="pill">Interactive chess position</span> : null}
                      <span className="pill">{item.published ? "Published" : "Draft"}</span>
                    </div>

                    <details style={{ marginTop: 14 }} open>
                      <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                        Student results ({students.length})
                      </summary>
                      {!students.length ? (
                        <div className="small" style={{ marginTop: 8 }}>No active students are currently in this class.</div>
                      ) : (
                        <div className="list" style={{ marginTop: 8 }}>
                          {students.map((student: any) => {
                            const submission: any = submissionByStudent.get(student.id);
                            const attempt: any = attemptByStudent.get(student.id);
                            return (
                              <div className="row" key={student.id} style={{ alignItems: "flex-start" }}>
                                <div>
                                  <b>{student.full_name}</b>
                                  {hasInteractive ? (
                                    <div className="small" style={{ marginTop: 4 }}>
                                      Chess: {attempt?.solved ? `Solved${attempt.solved_at ? ` ${formatDateTime(attempt.solved_at)}` : ""}` : attempt ? "Started, not solved" : "Not started"}
                                      {attempt ? ` · ${attempt.mistakes} mistake${attempt.mistakes === 1 ? "" : "s"}` : ""}
                                    </div>
                                  ) : null}
                                  {hasFileWork ? (
                                    <div className="small" style={{ marginTop: 4 }}>
                                      File: {submission ? `Submitted ${formatDateTime(submission.submitted_at)} · ${submission.file_name}` : "Not submitted yet"}
                                    </div>
                                  ) : null}
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                  {hasInteractive ? <span className="pill">{attempt?.solved ? "Solved ✓" : "Not solved"}</span> : null}
                                  {submission?.download_url ? (
                                    <a className="btn secondary" href={submission.download_url}>Download submission</a>
                                  ) : hasFileWork ? (
                                    <span className="pill">No file</span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
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
