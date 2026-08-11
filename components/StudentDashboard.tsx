import PortalShell from "./PortalShell";
import StudentHomeworkSubmissionForm from "./StudentHomeworkSubmissionForm";
import { createClient } from "@/lib/supabase/server";
import { createHomeworkDownloadUrl } from "@/lib/homework-files";
import { registerForTournament } from "@/app/portal/tournaments/actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFee(amount: number | string | null, currency: string | null) {
  if (amount === null || Number(amount) === 0) return "Free";
  const numericAmount = Number(amount);
  if (currency === "LBP") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numericAmount)} LBP`;
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numericAmount)}`;
}

export default async function StudentDashboard({ profile }: { profile: any }) {
  const supabase = await createClient();

  const [{ data: enrollment }, { data: tournaments }, { data: registrations }, { data: homeworkSubmissions }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("class_id, class:classes(id, name, branch:branches(name), level:levels(name))")
      .eq("student_id", profile.id)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("tournaments")
      .select("id, title, venue, starts_at, registration_deadline, description, fee_amount, fee_currency, open_for_registration, branch:branches(name)")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("tournament_registrations")
      .select("tournament_id, status, registered_at")
      .eq("student_id", profile.id),
    supabase
      .from("homework_submissions")
      .select("id, homework_id, file_path, file_name, submitted_at, updated_at")
      .eq("student_id", profile.id),
  ]);

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
        .select("id, class_id, title, instructions, attachment_url, attachment_path, attachment_name, due_date, created_at")
        .eq("class_id", enrollment.class_id)
        .eq("published", true)
        .order("created_at", { ascending: false }),
    ]);

    coaches = (coachResult.data || []).map((item: any) => item.coach).filter(Boolean);
    homework = homeworkResult.data || [];
  }

  const homeworkWithDownloads = await Promise.all(homework.map(async (item: any) => ({
    ...item,
    attachment_download_url: await createHomeworkDownloadUrl(supabase, item.attachment_path),
  })));

  const submissionsWithDownloads = await Promise.all((homeworkSubmissions || []).map(async (item: any) => ({
    ...item,
    download_url: await createHomeworkDownloadUrl(supabase, item.file_path),
  })));

  const submissionByHomework = new Map<string, any>();
  for (const submission of submissionsWithDownloads) submissionByHomework.set(submission.homework_id, submission);

  const classInfo: any = enrollment?.class;
  const registrationByTournament = new Map<string, any>();
  for (const registration of registrations || []) registrationByTournament.set(registration.tournament_id, registration);
  const now = new Date();

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
          ) : !homeworkWithDownloads.length ? (
            <p className="small">No homework assigned yet.</p>
          ) : (
            <div className="list">
              {homeworkWithDownloads.map((item: any) => {
                const submission = submissionByHomework.get(item.id);
                return (
                  <div className="card" key={item.id} style={{ boxShadow: "none" }}>
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{item.title}</h3>
                        {item.due_date ? <div className="small">Due {item.due_date}</div> : null}
                      </div>
                      {submission ? <span className="pill">Submitted</span> : <span className="pill">To do</span>}
                    </div>

                    {item.instructions ? <p>{item.instructions}</p> : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {item.attachment_download_url ? (
                        <a className="btn secondary" href={item.attachment_download_url}>Download {item.attachment_name || "homework file"}</a>
                      ) : null}
                      {item.attachment_url ? (
                        <a className="btn secondary" href={item.attachment_url} target="_blank" rel="noreferrer">Open resource link</a>
                      ) : null}
                      {submission?.download_url ? (
                        <a className="btn secondary" href={submission.download_url}>Download my submission</a>
                      ) : null}
                    </div>

                    {submission ? (
                      <div className="small" style={{ marginTop: 10 }}>
                        Submitted {formatDate(submission.submitted_at)} · {submission.file_name}
                      </div>
                    ) : null}

                    <StudentHomeworkSubmissionForm
                      homeworkId={item.id}
                      classId={item.class_id}
                      studentId={profile.id}
                      existingPath={submission?.file_path || null}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card span12">
          <h2>Upcoming Tournaments</h2>
          {!tournaments?.length ? (
            <p className="small">No upcoming tournaments yet.</p>
          ) : (
            <div className="list">
              {tournaments.map((tournament: any) => {
                const registration = registrationByTournament.get(tournament.id);
                const deadlinePassed = tournament.registration_deadline
                  ? new Date(tournament.registration_deadline) < now
                  : false;
                const canRegister = tournament.open_for_registration && !deadlinePassed && !registration;

                return (
                  <div className="card" key={tournament.id} style={{ boxShadow: "none" }}>
                    <div className="row">
                      <div>
                        <h3 style={{ marginBottom: 6 }}>{tournament.title}</h3>
                        <div className="small">
                          {formatDate(tournament.starts_at)}
                          {tournament.branch?.name ? ` · ${tournament.branch.name}` : ""}
                          {tournament.venue ? ` · ${tournament.venue}` : ""}
                        </div>
                        <div className="small" style={{ marginTop: 4 }}>Fee: {formatFee(tournament.fee_amount, tournament.fee_currency)}</div>
                        {tournament.registration_deadline ? (
                          <div className="small" style={{ marginTop: 4 }}>Register by {formatDate(tournament.registration_deadline)}</div>
                        ) : null}
                      </div>

                      {registration ? (
                        <span className="pill">{registration.status}</span>
                      ) : canRegister ? (
                        <form action={registerForTournament}>
                          <input type="hidden" name="tournament_id" value={tournament.id} />
                          <button className="btn" type="submit">Register</button>
                        </form>
                      ) : (
                        <span className="pill">Registration closed</span>
                      )}
                    </div>
                    {tournament.description ? <p>{tournament.description}</p> : null}
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
