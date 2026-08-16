import type { Metadata } from "next";
import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import { createClient } from "@/lib/supabase/server";
import { registerPublicTeamTournament, registerPublicTournament } from "./actions";

export const metadata: Metadata = {
  title: "Chess Tournaments in Lebanon",
  description:
    "Upcoming Shamieh Chess tournaments with dates, venues, fees, deadlines and public registration.",
  alternates: {
    canonical: "/tournaments",
  },
  openGraph: {
    url: "/tournaments",
    title: "Chess Tournaments in Lebanon | Shamieh Chess Academy",
    description: "Upcoming chess tournaments and public registration from Shamieh Chess Academy.",
    images: ["/images/shamieh-achievements.webp"],
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFee(amount: number | string | null, currency: string | null) {
  if (amount === null || Number(amount) === 0) return "Free";
  const numericAmount = Number(amount);
  if (currency === "LBP") return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numericAmount)} LBP`;
  return `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numericAmount)}`;
}

function teamFeeLabel(amount: number | string | null, currency: string | null) {
  const perPlayer = formatFee(amount, currency);
  if (currency === "USD" && Number(amount) === 10) return "$10 / player · $30 team of 3 · $40 team of 4";
  return `${perPlayer} / player`;
}

function TeamRegistrationForm({ tournamentId }: { tournamentId: string }) {
  return (
    <form action={registerPublicTeamTournament}>
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <div className="public-honeypot" aria-hidden="true">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <label className="field">
        <span>Team name</span>
        <input className="input" name="team_name" required maxLength={120} placeholder="Enter your team name" />
      </label>
      <p className="public-form-note" style={{ marginTop: -4 }}>Team names must be appropriate and must not offend anyone.</p>

      <div className="grid" style={{ gap: 10 }}>
        {[1, 2, 3].map((board) => (
          <div className="span12" key={board} style={{ padding: 14, border: "1px solid #e2dccf", borderRadius: 14 }}>
            <b>Player {board} · Board {board}</b>
            <div className="grid" style={{ gap: 10, marginTop: 10 }}>
              <label className="field span7" style={{ margin: 0 }}>
                <span>Full name</span>
                <input className="input" name={`player_${board}_name`} required maxLength={120} />
              </label>
              <label className="field span5" style={{ margin: 0 }}>
                <span>FIDE ID</span>
                <input className="input" name={`player_${board}_fide_id`} required inputMode="numeric" maxLength={12} placeholder="e.g. 5304687" />
              </label>
            </div>
          </div>
        ))}

        <div className="span12" style={{ padding: 14, border: "1px dashed #cfc6b4", borderRadius: 14 }}>
          <b>Player 4 · Board 4 <span className="small">(optional)</span></b>
          <div className="grid" style={{ gap: 10, marginTop: 10 }}>
            <label className="field span7" style={{ margin: 0 }}>
              <span>Full name</span>
              <input className="input" name="player_4_name" maxLength={120} />
            </label>
            <label className="field span5" style={{ margin: 0 }}>
              <span>FIDE ID</span>
              <input className="input" name="player_4_fide_id" inputMode="numeric" maxLength={12} />
            </label>
          </div>
        </div>
      </div>

      <label className="field" style={{ marginTop: 16 }}>
        <span>Team captain</span>
        <select className="input" name="captain_board" required defaultValue="">
          <option value="" disabled>Choose the captain</option>
          <option value="1">Player 1 / Board 1</option>
          <option value="2">Player 2 / Board 2</option>
          <option value="3">Player 3 / Board 3</option>
          <option value="4">Player 4 / Board 4 (only if included)</option>
        </select>
      </label>

      <div className="grid" style={{ gap: 10 }}>
        <label className="field span6">
          <span>Contact phone / WhatsApp</span>
          <input className="input" name="contact_phone" type="tel" required maxLength={32} autoComplete="tel" placeholder="e.g. +961 3 123 456" />
        </label>
        <label className="field span6">
          <span>Contact email <span className="small">(optional)</span></span>
          <input className="input" name="contact_email" type="email" maxLength={254} autoComplete="email" />
        </label>
      </div>

      <div className="public-form-note" style={{ marginBottom: 14 }}>
        Fee: $10 per player — $30 for a team of 3 or $40 for a team of 4. Payment can be made at the venue or via WHISH to 81210816.
      </div>
      <button className="btn public-primary public-full-button" type="submit">Submit team registration</button>
    </form>
  );
}

export default async function PublicTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string; tournament?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, title, starts_at, registration_deadline, venue, description, fee_amount, fee_currency, open_for_registration, registration_type, chess_results_url, branch:branches(name)")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  return (
    <main className="public-site public-tournaments-page">
      <header className="public-header">
        <ShamiehLogo className="public-logo" />
        <nav className="public-nav" aria-label="Main navigation">
          <Link href="/#academy">Academy</Link>
          <Link href="/#locations">Saida & Beirut</Link>
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/register" className="btn public-header-join">Join Academy</Link>
          <Link href="/login" className="btn secondary">Student Login</Link>
        </nav>
      </header>

      <section className="public-page-intro">
        <span className="public-eyebrow">SHAMIEH CHESS TOURNAMENTS</span>
        <h1>Find your next tournament.</h1>
        <p>See upcoming events, registration deadlines, locations, and fees. Tournament registration is open to the public when the event is marked open.</p>
      </section>

      <section className="public-section public-tournament-list-section">
        {params.error ? <div className="public-alert public-alert-error">{params.error}</div> : null}
        {params.registered ? <div className="public-alert public-alert-success"><b>Registration received.</b> Your tournament entry has been submitted to Shamieh Chess.</div> : null}

        {!tournaments?.length ? (
          <div className="public-empty">
            <h2>No upcoming tournaments yet.</h2>
            <p>New events will appear here as soon as they are published by the academy.</p>
            <Link className="btn" href="/">Back to the academy</Link>
          </div>
        ) : (
          <div className="public-tournament-list">
            {tournaments.map((tournament: any) => {
              const deadlinePassed = tournament.registration_deadline ? new Date(tournament.registration_deadline) < new Date() : false;
              const canRegister = tournament.open_for_registration && !deadlinePassed;
              const showSuccess = params.registered === tournament.id;
              const showError = params.tournament === tournament.id && Boolean(params.error);
              const isTeam = tournament.registration_type === "team";

              return (
                <article className="public-tournament-detail" id={`tournament-${tournament.id}`} key={tournament.id}>
                  <div className="public-tournament-detail-main">
                    <div className="public-tournament-date">{formatDate(tournament.starts_at)}</div>
                    <div className="public-tournament-title-row">
                      <h2>{tournament.title}</h2>
                      <span className={`pill ${canRegister ? "" : "public-pill-muted"}`}>{canRegister ? "Registration open" : "Registration closed"}</span>
                    </div>
                    <div className="public-tournament-facts">
                      <div><span>Location</span><b>{[tournament.branch?.name, tournament.venue].filter(Boolean).join(" · ") || "To be announced"}</b></div>
                      <div><span>Entry fee</span><b>{isTeam ? teamFeeLabel(tournament.fee_amount, tournament.fee_currency) : formatFee(tournament.fee_amount, tournament.fee_currency)}</b></div>
                      <div><span>Registration deadline</span><b>{tournament.registration_deadline ? formatDate(tournament.registration_deadline) : "No stated deadline"}</b></div>
                    </div>
                    {tournament.chess_results_url ? (
                      <div style={{ marginTop: 16 }}>
                        <a className="btn secondary" href={tournament.chess_results_url} target="_blank" rel="noopener noreferrer">
                          {isTeam ? "View registered teams" : "View registered players"} ↗
                        </a>
                      </div>
                    ) : null}
                    {tournament.description ? <p className="public-tournament-description" style={{ whiteSpace: "pre-line" }}>{tournament.description}</p> : null}
                  </div>

                  <div className="public-registration-panel">
                    {showSuccess ? (
                      <div className="public-registration-success">
                        <div className="registration-check">✓</div>
                        <h3>{isTeam ? "Team registered" : "You're registered"}</h3>
                        <p>{isTeam ? "Your team entry was received. The academy can now see the complete roster in the tournament registrations list." : "Your entry was received. The academy can now see it in the tournament registrations list."}</p>
                      </div>
                    ) : canRegister ? (
                      <>
                        <h3>{isTeam ? "Register your team" : "Register for this tournament"}</h3>
                        <p className="public-muted">You do not need an academy account to register.</p>
                        {showError ? <div className="public-inline-error">{params.error}</div> : null}
                        {isTeam ? (
                          <TeamRegistrationForm tournamentId={tournament.id} />
                        ) : (
                          <form action={registerPublicTournament}>
                            <input type="hidden" name="tournament_id" value={tournament.id} />
                            <div className="public-honeypot" aria-hidden="true">
                              <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                            </div>
                            <label className="field">
                              <span>Participant full name</span>
                              <input className="input" name="full_name" required maxLength={120} autoComplete="name" />
                            </label>
                            <label className="field">
                              <span>Email</span>
                              <input className="input" name="email" type="email" required maxLength={254} autoComplete="email" />
                            </label>
                            <label className="field">
                              <span>Phone number</span>
                              <input className="input" name="phone" type="tel" required maxLength={32} autoComplete="tel" placeholder="e.g. +961 3 123 456" />
                            </label>
                            <label className="field">
                              <span>Date of birth</span>
                              <input className="input" name="date_of_birth" type="date" required />
                            </label>
                            <label className="field">
                              <span>FIDE ID <span className="small">(optional)</span></span>
                              <input className="input" name="fide_id" maxLength={32} placeholder="e.g. 1234567" />
                            </label>
                            <button className="btn public-primary public-full-button" type="submit">Submit tournament registration</button>
                          </form>
                        )}
                        <p className="public-form-note">{isTeam ? "Team details may be changed with the organizers until Friday, 4 September 2026 at 20:00." : "Academy students can also register from their student portal."}</p>
                      </>
                    ) : (
                      <div className="public-registration-closed">
                        <h3>Registration closed</h3>
                        <p>{deadlinePassed ? "The registration deadline has passed." : "Online registration is currently closed for this tournament."}</p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="public-cta public-cta-compact">
        <div><span className="public-eyebrow">ACADEMY CLASSES</span><h2>Want regular chess training too?</h2><p>Join Shamieh Chess Academy in Saida or Beirut.</p></div>
        <Link className="btn public-primary" href="/register">Register as a Student</Link>
      </section>

      <footer className="public-footer">
        <div><ShamiehLogo /></div>
        <div>Shamieh Chess Academy · Saida & Beirut</div>
        <div className="public-footer-links"><Link href="/">Home</Link><Link href="/login">Student Login</Link></div>
      </footer>
    </main>
  );
}
