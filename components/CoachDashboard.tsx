import Link from "next/link";
import PortalShell from "./PortalShell";
import CoachHomeworkForm from "./CoachHomeworkForm";
import DeleteHomeworkButton from "./DeleteHomeworkButton";
import { createClient } from "@/lib/supabase/server";
import { createHomeworkDownloadUrl } from "@/lib/homework-files";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CoachDashboard({ profile }: { profile: any }) {
  const supabase = await createClient();

  const [
    { data: assignments },
    { data: enrollments },
    { data: homework },
    { data: submissions },
    { data: chessAttempts },
  ] = await Promise.all([
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
      .select("id, class_id, title, instructions, attachment_url, attachment_path, attachment_name, due_date, created_at, interactive_position_fen, class:classes(name)")
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

  const classOptions = (assignments || []).map((assignment: any) => ({
    id: assignment.class_id,
    label: `${assignment.class?.branch?.name || ""} · ${assignment.class?.level?.name || ""} · ${assignment.class?.name || "Class"}`,
  }));

  return (
    <PortalShell title={`Welcome, Coach ${profile.full_name}`} role="Coach">
      {profile.is_admin ? (
        <div className="nav" style={{ marginBottom: 18 }}>
          <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
          <span className="pill">Admin + Coach</span>
        </div>
      ) : null}

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
          <p className="small">Give homework as a PDF/Word file, a resource link, an interactive chess position, or a combination of them.</p>
          {!classOptions.length ? (
            <p className="small">A class must be assigned before you can create homework.</p>
          ) : (
            <CoachHomeworkForm classes={classOptions} />
          )}
        </div>

        <div className="card span12">
          <h2>Homework & student work</h2>
          {!homeworkWithDownloads.length ? (
            <p className="small">No homework posted yet.</p>
          ) : (
            <div className="list">
              {homeworkWithDownloads.map((item: any) => {
                const students = studentsByClass.get(item.class_id) || [];
                const itemSubmissions = submissionsByHomework.get(item.id) || [];
                const itemAttempts = chessAttemptsByHomework.get(item.id) || [];
                const submissionByStudent = new Map(itemSubmissions.map((submission: any) => [submission.student_id, submission]));
                const attemptByStudent = new Map(itemAttempts.map((attempt: any) => [attempt.student_id, attempt]));
                const hasInteractive = Boolean(item.interactive_position_fen);
                const hasFileWork = Boolean(item.attachment_path || item.attachment_url);
                const solvedCount = itemAttempts.filter((attempt: any) => attempt.solved).length;

                return (
                  <div className="card" key={item.id} style={{ boxShadow: "none" }}>
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{item.title}</h3>
                        <div className="small">{item.class?.name}{item.due_date ? ` · Due ${item.due_date}` : ""}</div>
                        {item.instructions ? <div style={{ marginTop: 8 }}>{item.instructions}</div> : null}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                        {hasInteractive ? <span className="pill">{solvedCount}/{students.length} chess solved</span> : null}
                        {hasFileWork ? <span className="pill">{itemSubmissions.length}/{students.length} files</span> : null}
                        <DeleteHomeworkButton homeworkId={item.id} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {item.attachment_download_url ? (
                        <a className="btn secondary" href={item.attachment_download_url}>Download {item.attachment_name || "homework file"}</a>
                      ) : null}
                      {item.attachment_url ? (
                        <a className="btn secondary" href={item.attachment_url} target="_blank" rel="noreferrer">Open resource link</a>
                      ) : null}
                      {hasInteractive ? <span className="pill">Interactive chess position</span> : null}
                    </div>

                    <details style={{ marginTop: 14 }} open>
                      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Student results ({students.length})</summary>
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
                                      File: {submission ? `Submitted ${formatDateTime(submission.submitted_at)}` : "Not submitted yet"}
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
