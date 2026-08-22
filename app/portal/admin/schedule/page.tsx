import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import TrainingSessionForm from "@/components/TrainingSessionForm";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/access";
import { formatClock, formatSessionDate, getBeirutIsoDate } from "@/lib/training-schedule";
import { createTrainingSessions, deleteTrainingSession } from "./actions";

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; deleted?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();
  if (!hasAdminAccess(profile)) redirect("/portal");

  const today = getBeirutIsoDate();
  const [{ data: classes }, { data: sessions }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, branch:branches(name), level:levels(name, sort_order)")
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("training_sessions")
      .select("id, delivery_mode, session_date, start_time, end_time, class:classes(name, branch:branches(name), level:levels(name))")
      .eq("active", true)
      .gte("session_date", today)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(150),
  ]);

  const classOptions = (classes || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    branch: item.branch?.name || "Branch",
    level: item.level?.name || "Level",
  }));

  return (
    <PortalShell title="Training Schedule" role="Admin">
      <div style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      {params.error ? (
        <div className="card" style={{ borderColor: "#e7c6c2", background: "#f8e8e6", marginBottom: 18 }}>
          <b>Could not save schedule</b><div className="small" style={{ marginTop: 5 }}>{params.error}</div>
        </div>
      ) : null}
      {params.created ? (
        <div className="card" style={{ borderColor: "#c6ddcc", background: "#e6f1e9", marginBottom: 18 }}>
          Published {params.created} training date{params.created === "1" ? "" : "s"}.
        </div>
      ) : null}
      {params.deleted ? (
        <div className="card" style={{ borderColor: "#c6ddcc", background: "#e6f1e9", marginBottom: 18 }}>
          Training session removed.
        </div>
      ) : null}

      <div className="grid">
        <div className="card span5">
          <h2>Publish training dates</h2>
          <p className="small">Choose a class, set the training type and time, then add one or several exact dates. These dates immediately appear on the public website and on enrolled students&apos; schedules.</p>
          {!classOptions.length ? (
            <p className="small">No active classes are available. Create or activate a class first.</p>
          ) : (
            <TrainingSessionForm classes={classOptions} today={today} action={createTrainingSessions} />
          )}
        </div>

        <div className="card span7">
          <div className="row" style={{ paddingTop: 0 }}>
            <div><h2 style={{ marginBottom: 4 }}>Upcoming sessions</h2><div className="small">Published from today onward</div></div>
            <span className="pill">{sessions?.length || 0}</span>
          </div>

          {!sessions?.length ? (
            <p className="small">No upcoming training sessions have been published.</p>
          ) : (
            <div className="list">
              {sessions.map((session: any) => (
                <div className="row" key={session.id} style={{ alignItems: "flex-start" }}>
                  <div>
                    <b>{formatSessionDate(session.session_date)}</b>
                    <div style={{ marginTop: 4 }}>{formatClock(session.start_time)} – {formatClock(session.end_time)}</div>
                    <div className="small" style={{ marginTop: 5 }}>
                      {session.class?.branch?.name} · {session.class?.level?.name} · {session.class?.name} · {session.delivery_mode === "online" ? "Online" : "Inside Academy"}
                    </div>
                  </div>
                  <form action={deleteTrainingSession}>
                    <input type="hidden" name="id" value={session.id} />
                    <button className="btn secondary" type="submit">Remove</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
