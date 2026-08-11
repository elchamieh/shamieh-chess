import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { createTournament, deleteTournament, setTournamentRegistration, updateTournament } from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBirthDate(value: string | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function toBeirutInputValue(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Beirut",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function formatFee(amount: number | string | null, currency: string | null) {
  if (amount === null || Number(amount) === 0) return "Free";
  const numericAmount = Number(amount);
  if (currency === "LBP") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numericAmount)} LBP`;
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numericAmount)}`;
}

export default async function AdminTournamentsPage({ searchParams }: { searchParams: Promise<{ created?: string; updated?: string; deleted?: string; error?: string }> }) {
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
      .select("id, title, branch_id, venue, starts_at, registration_deadline, description, fee_amount, fee_currency, open_for_registration, branch:branches(name)")
      .order("starts_at", { ascending: false }),
    supabase
      .from("tournament_registrations")
      .select("id, tournament_id, student_id, registrant_name, registrant_email, registrant_phone, date_of_birth, fide_id, status, registered_at, student:profiles(id, full_name)")
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
      {params.updated ? <div className="card" style={{ marginBottom: 18 }}><b>Tournament updated.</b></div> : null}
      {params.deleted ? <div className="card" style={{ marginBottom: 18 }}><b>Tournament deleted.</b></div> : null}
      {params.error ? <div className="card" style={{ marginBottom: 18 }}><b>Could not complete action:</b> {decodeURIComponent(params.error)}</div> : null}

      <div className="grid">
        <div className="card span4">
          <h2>Create tournament</h2>
          <p className="small">Times below are entered in Lebanon time. When registration is open, the tournament also appears on the public website.</p>
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
            <div className="row" style={{ alignItems: "end" }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Fee</span>
                <input className="input" name="fee_amount" type="number" min="0" step="0.01" placeholder="Leave blank for free" />
              </label>
              <label className="field" style={{ width: 110 }}>
                <span>Currency</span>
                <select className="input" name="fee_currency" defaultValue="USD">
                  <option value="USD">USD</option>
                  <option value="LBP">LBP</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Description</span>
              <textarea className="input" name="description" rows={4} placeholder="Format, eligibility, notes..." />
            </label>
            <button className="btn" type="submit">Create tournament</button>
          </form>
        </div>

        <div className="card span8">
          <h2>Events & registrations</h2>
          <p className="small">Registrations can now come from academy student accounts or directly from the public tournament page.</p>
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
                        <div className="small" style={{ marginTop: 4 }}>Fee: {formatFee(tournament.fee_amount, tournament.fee_currency)}</div>
                        {tournament.registration_deadline ? <div className="small" style={{ marginTop: 4 }}>Registration deadline: {formatDate(tournament.registration_deadline)}</div> : null}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <a className="btn secondary" href={`/tournaments#tournament-${tournament.id}`} target="_blank" rel="noreferrer">Public page</a>
                        <form action={setTournamentRegistration}>
                          <input type="hidden" name="tournament_id" value={tournament.id} />
                          <input type="hidden" name="open_for_registration" value={tournament.open_for_registration ? "false" : "true"} />
                          <button className={`btn ${tournament.open_for_registration ? "secondary" : ""}`} type="submit">
                            {tournament.open_for_registration ? "Close registration" : "Open registration"}
                          </button>
                        </form>
                        <form action={deleteTournament}>
                          <input type="hidden" name="tournament_id" value={tournament.id} />
                          <button className="btn secondary" type="submit">Delete</button>
                        </form>
                      </div>
                    </div>

                    {tournament.description ? <p>{tournament.description}</p> : null}

                    <details style={{ marginTop: 14 }}>
                      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Edit tournament</summary>
                      <form action={updateTournament} style={{ marginTop: 14 }}>
                        <input type="hidden" name="tournament_id" value={tournament.id} />
                        <div className="grid">
                          <label className="field span6">
                            <span>Title</span>
                            <input className="input" name="title" required defaultValue={tournament.title} />
                          </label>
                          <label className="field span6">
                            <span>Branch</span>
                            <select className="input" name="branch_id" defaultValue={tournament.branch_id || ""}>
                              <option value="">No specific branch</option>
                              {(branches || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </select>
                          </label>
                          <label className="field span6">
                            <span>Venue</span>
                            <input className="input" name="venue" defaultValue={tournament.venue || ""} />
                          </label>
                          <label className="field span6">
                            <span>Starts</span>
                            <input className="input" name="starts_at" type="datetime-local" required defaultValue={toBeirutInputValue(tournament.starts_at)} />
                          </label>
                          <label className="field span6">
                            <span>Registration deadline</span>
                            <input className="input" name="registration_deadline" type="datetime-local" defaultValue={toBeirutInputValue(tournament.registration_deadline)} />
                          </label>
                          <label className="field span3">
                            <span>Fee</span>
                            <input className="input" name="fee_amount" type="number" min="0" step="0.01" defaultValue={tournament.fee_amount ?? ""} placeholder="Free" />
                          </label>
                          <label className="field span3">
                            <span>Currency</span>
                            <select className="input" name="fee_currency" defaultValue={tournament.fee_currency || "USD"}>
                              <option value="USD">USD</option>
                              <option value="LBP">LBP</option>
                            </select>
                          </label>
                          <label className="field span12">
                            <span>Description</span>
                            <textarea className="input" name="description" rows={4} defaultValue={tournament.description || ""} />
                          </label>
                        </div>
                        <button className="btn" type="submit">Save changes</button>
                      </form>
                    </details>

                    <div style={{ marginTop: 14 }}>
                      <b>{eventRegistrations.length} registration{eventRegistrations.length === 1 ? "" : "s"}</b>
                      {!eventRegistrations.length ? (
                        <div className="small" style={{ marginTop: 6 }}>No registrations yet.</div>
                      ) : (
                        <div className="list" style={{ marginTop: 8 }}>
                          {eventRegistrations.map((registration: any) => {
                            const isPublic = !registration.student_id;
                            const participantName = registration.student?.full_name || registration.registrant_name || "Participant";
                            return (
                              <div className="row" key={registration.id} style={{ alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                    <b>{participantName}</b>
                                    <span className="pill">{isPublic ? "Public registration" : "Academy student"}</span>
                                  </div>
                                  {isPublic ? (
                                    <div className="small" style={{ marginTop: 6, lineHeight: 1.6 }}>
                                      Email: <b>{registration.registrant_email || "Not provided"}</b><br />
                                      Phone: <b>{registration.registrant_phone || "Not provided"}</b><br />
                                      Date of birth: <b>{formatBirthDate(registration.date_of_birth)}</b><br />
                                      FIDE ID: <b>{registration.fide_id || "Not provided"}</b>
                                    </div>
                                  ) : null}
                                  <div className="small" style={{ marginTop: 5 }}>Registered {formatDate(registration.registered_at)}</div>
                                </div>
                                <span className="pill">{registration.status}</span>
                              </div>
                            );
                          })}
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
