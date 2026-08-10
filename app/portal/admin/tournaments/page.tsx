import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { createTournament, setTournamentRegistration } from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminTournamentsPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" || profile?.approved !== true) redirect("/portal");

  const [{ data: branches }, { data: tournaments }, { data: registrations }] = await Promise.all([
    supabase.from("branches").select("id, name").order("name"),
    supabase
      .from("tournaments")
      .select("id, title, venue, starts_at, registration_deadline, description, open_for_registration, branch:branches(name)")
      .order("starts_at", { ascending: false }),
    supabase
      .from("tournament_registrations")
      .select("id, tournament_id, status, registered_at, student:profiles(id, full_name)")
      .order("registered_at", { ascending: true }),
  ]);

  const registrationsByTournament = new Map<string, any[]>();
  for (const registration of registrations || []) {
    const list = registrationsByTournament.get(registration.tournament_id) || [];
    list.push(registration);
    registrationsByTournament.set(registration.tournament_id, list);
  }

  return (
    <PortalShell title="Tournaments" role="Admin">
      <div style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      {params.created ? <div className="card" style={{ marginBottom: 18 }}><b>Tournament created.</b></div> : null}
      {params.error ? <div className="card" style={{ marginBottom: 18 }}><b>Could not complete action:</b> {decodeURIComponent(params.error)}</div> : null}

      <div className="grid">
        <div className="card span4">
          <h2>Create tournament</h2>
          <p className="small">Times below are entered in Lebanon time.</p>
          <form action={createTournament}>
            <label className="field">
              <span>Title</span>
              <input className="input" name="title" required placeholder="Shamieh Chess Rapid" />
            </label>
            <label className="field">
              <span>Branch</span>
              <select className="input" name="branch_id" defaultValue="">
                <option value="">No specific branch</option>
                {(branches || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Venue</span>
              <input className="input" name="venue" placeholder="Academy / venue name" />
            </label>
            <label className="field">
              <span>Starts</span>
              <input className="input" name="starts_at" type="datetime-local" required />
            </label>
            <label className="field">
              <span>Registration deadline</span>
              <input className="input" name="registration_deadline" type="datetime-local" />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea className="input" name="description" rows={4} placeholder="Format, eligibility, notes..." />
            </label>
            <button className="btn" type="submit">Create tournament</button>
          </form>
        </div>

        <div className="card span8">
          <h2>Events & registrations</h2>
          {!tournaments?.length ? (
            <p className="small">No tournaments created yet.</p>
          ) : (
            <div className="list">
              {tournaments.map((tournament: any) => {
                const eventRegistrations = registrationsByTournament.get(tournament.id) || [];
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
                        {tournament.registration_deadline ? <div className="small" style={{ marginTop: 4 }}>Registration deadline: {formatDate(tournament.registration_deadline)}</div> : null}
                      </div>
                      <form action={setTournamentRegistration}>
                        <input type="hidden" name="tournament_id" value={tournament.id} />
                        <input type="hidden" name="open_for_registration" value={tournament.open_for_registration ? "false" : "true"} />
                        <button className={`btn ${tournament.open_for_registration ? "secondary" : ""}`} type="submit">
                          {tournament.open_for_registration ? "Close registration" : "Open registration"}
                        </button>
                      </form>
                    </div>

                    {tournament.description ? <p>{tournament.description}</p> : null}

                    <div style={{ marginTop: 14 }}>
                      <b>{eventRegistrations.length} registration{eventRegistrations.length === 1 ? "" : "s"}</b>
                      {!eventRegistrations.length ? (
                        <div className="small" style={{ marginTop: 6 }}>No students registered yet.</div>
                      ) : (
                        <div className="list" style={{ marginTop: 8 }}>
                          {eventRegistrations.map((registration: any) => (
                            <div className="row" key={registration.id}>
                              <div>
                                <b>{registration.student?.full_name || "Student"}</b>
                                <div className="small">Registered {formatDate(registration.registered_at)}</div>
                              </div>
                              <span className="pill">{registration.status}</span>
                            </div>
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
      </div>
    </PortalShell>
  );
}
