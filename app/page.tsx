import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import { createClient } from "@/lib/supabase/server";

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

export default async function HomePage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, title, starts_at, registration_deadline, venue, description, fee_amount, fee_currency, open_for_registration, branch:branches(name)")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(3);

  return (
    <main className="public-site">
      <header className="public-header">
        <Link href="/" className="public-logo" aria-label="Shamieh Chess Academy home">
          <ShamiehLogo />
        </Link>
        <nav className="public-nav" aria-label="Main navigation">
          <a href="#academy">Academy</a>
          <a href="#locations">Saida & Beirut</a>
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/register">Join the Academy</Link>
          <Link href="/login" className="btn secondary">Student Login</Link>
        </nav>
      </header>

      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="public-eyebrow">SHAMIEH CHESS ACADEMY · SAIDA · BEIRUT</span>
          <h1>Train with purpose.<br />Play with confidence.</h1>
          <p>
            Structured chess training for every level, from first moves to advanced competitive play — with academy classes, tournaments, and a growing chess community in Saida and Beirut.
          </p>
          <div className="public-actions">
            <Link className="btn public-primary" href="/register">Join the Academy</Link>
            <Link className="btn secondary" href="/tournaments">View Tournaments</Link>
          </div>
          <div className="public-quickfacts">
            <div><b>2</b><span>Academy locations</span></div>
            <div><b>4</b><span>Training levels</span></div>
            <div><b>♟</b><span>Classes & tournaments</span></div>
          </div>
        </div>
        <div className="public-hero-art" aria-hidden="true">
          <div className="hero-ring hero-ring-one" />
          <div className="hero-ring hero-ring-two" />
          <div className="hero-piece">♞</div>
          <div className="hero-card hero-card-top">Train</div>
          <div className="hero-card hero-card-bottom">Compete</div>
        </div>
      </section>

      <section className="public-section" id="academy">
        <div className="public-section-heading">
          <span className="public-eyebrow">THE ACADEMY</span>
          <h2>A clear path for every player</h2>
          <p>Students progress through structured levels with coaching, practice, homework, and over-the-board play.</p>
        </div>
        <div className="public-level-grid">
          {["Starters", "Beginners", "Intermediate", "Advanced"].map((level, index) => (
            <div className="public-level-card" key={level}>
              <span>0{index + 1}</span>
              <h3>{level}</h3>
              <p>{index === 0 ? "Learn the board, pieces, rules, and the habits that make chess fun." : index === 1 ? "Build tactical awareness, opening principles, and confident game play." : index === 2 ? "Strengthen calculation, strategy, endgames, and tournament discipline." : "Develop deeper preparation, calculation, positional understanding, and competitive consistency."}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="public-section public-locations" id="locations">
        <div className="public-section-heading">
          <span className="public-eyebrow">TWO LOCATIONS</span>
          <h2>Train with Shamieh Chess in Saida or Beirut</h2>
          <p>Choose the location that works for your family while following the same academy structure and progression.</p>
        </div>
        <div className="public-location-grid">
          <article className="public-location-card">
            <div className="location-marker">01</div>
            <div>
              <h3>Saida</h3>
              <p>Academy classes across Starters, Beginners, Intermediate, and Advanced levels.</p>
              <Link href="/register">Register for Saida →</Link>
            </div>
          </article>
          <article className="public-location-card">
            <div className="location-marker">02</div>
            <div>
              <h3>Beirut</h3>
              <p>Structured chess training with the same academy progression and competitive pathway.</p>
              <Link href="/register">Register for Beirut →</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="public-section public-tournaments" id="tournaments">
        <div className="public-section-heading public-heading-row">
          <div>
            <span className="public-eyebrow">UPCOMING TOURNAMENTS</span>
            <h2>Play. Compete. Improve.</h2>
            <p>Public tournaments are listed here directly from the academy tournament system.</p>
          </div>
          <Link className="btn secondary" href="/tournaments">See all tournaments</Link>
        </div>

        {!tournaments?.length ? (
          <div className="public-empty">New tournaments will be announced here.</div>
        ) : (
          <div className="public-tournament-grid">
            {tournaments.map((tournament: any) => {
              const deadlinePassed = tournament.registration_deadline ? new Date(tournament.registration_deadline) < new Date() : false;
              const canRegister = tournament.open_for_registration && !deadlinePassed;
              return (
                <article className="public-tournament-card" key={tournament.id}>
                  <div className="public-tournament-date">{formatDate(tournament.starts_at)}</div>
                  <h3>{tournament.title}</h3>
                  <p className="public-muted">
                    {[tournament.branch?.name, tournament.venue].filter(Boolean).join(" · ") || "Location to be announced"}
                  </p>
                  <div className="public-tournament-meta">
                    <span>{formatFee(tournament.fee_amount, tournament.fee_currency)}</span>
                    <span className={`pill ${canRegister ? "" : "public-pill-muted"}`}>{canRegister ? "Registration open" : "Registration closed"}</span>
                  </div>
                  <Link className="public-card-link" href={`/tournaments#tournament-${tournament.id}`}>{canRegister ? "Register now →" : "View details →"}</Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="public-cta">
        <div>
          <span className="public-eyebrow">READY TO START?</span>
          <h2>Make chess part of their week.</h2>
          <p>Register as an academy student, or join one of our public tournaments.</p>
        </div>
        <div className="public-actions">
          <Link className="btn public-primary" href="/register">Join Shamieh Chess</Link>
          <Link className="btn secondary" href="/tournaments">Tournament Registration</Link>
        </div>
      </section>

      <footer className="public-footer">
        <div><ShamiehLogo /></div>
        <div>Shamieh Chess Academy · Saida & Beirut</div>
        <div className="public-footer-links"><Link href="/login">Student Login</Link><Link href="/tournaments">Tournaments</Link></div>
      </footer>
    </main>
  );
}
