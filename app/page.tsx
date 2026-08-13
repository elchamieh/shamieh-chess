import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import PublicTrainingSchedule from "@/components/PublicTrainingSchedule";
import { createClient } from "@/lib/supabase/server";
import { getBeirutIsoDate } from "@/lib/training-schedule";
import "./public-home.css";

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

const levels = [
  {
    name: "Starters",
    text: "A welcoming first step into chess: the board, the pieces, the rules, and the habits that make learning enjoyable.",
  },
  {
    name: "Beginners",
    text: "Build strong foundations through tactics, opening principles, calculation, and confident over-the-board play.",
  },
  {
    name: "Intermediate",
    text: "Turn knowledge into consistent play with deeper calculation, strategy, endgames, and tournament discipline.",
  },
  {
    name: "Advanced",
    text: "Prepare for serious competition with stronger analysis, positional understanding, preparation, and decision-making.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const today = getBeirutIsoDate();
  const [{ data: tournaments }, { data: trainingSchedules }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, title, starts_at, registration_deadline, venue, description, fee_amount, fee_currency, open_for_registration, branch:branches(name)")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(3),
    supabase
      .from("training_schedules")
      .select("id, delivery_mode, weekday, start_time, end_time, effective_from, effective_to, branch:branches(name), level:levels(name, sort_order)")
      .eq("active", true)
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order("start_time", { ascending: true }),
  ]);

  return (
    <main className="public-site">
      <header className="public-header">
        <ShamiehLogo className="public-logo" />
        <nav className="public-nav" aria-label="Main navigation">
          <a href="#academy">Academy</a>
          <a href="#locations">Saida & Beirut</a>
          <a href="#schedule">Schedule</a>
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/register" className="btn public-header-join">Join Academy</Link>
          <Link href="/login" className="btn secondary">Student Login</Link>
        </nav>
      </header>

      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="public-eyebrow">SHAMIEH CHESS ACADEMY · SAIDA · BEIRUT</span>
          <h1>Train with purpose.<br />Play with confidence.</h1>
          <p>
            A structured chess academy where players learn step by step, challenge themselves over the board, and grow into confident competitors — with classes in Saida and Beirut and tournaments open to the wider chess community.
          </p>
          <div className="public-actions">
            <Link className="btn public-primary" href="/register">Join the Academy</Link>
            <Link className="btn secondary" href="/tournaments">View Tournaments</Link>
            <a className="public-text-link" href="#schedule">Training times ↓</a>
            <Link className="public-text-link" href="/login">Student login →</Link>
          </div>
          <div className="public-quickfacts">
            <div><b>2</b><span>Academy locations</span></div>
            <div><b>4</b><span>Training levels</span></div>
            <div><b>♟</b><span>Training & competition</span></div>
          </div>
        </div>
        <figure className="public-hero-media">
          <img
            src="/images/shamieh-tournament.webp"
            alt="Players competing in a Shamieh Chess tournament"
            width="1536"
            height="1024"
            fetchPriority="high"
            decoding="async"
          />
          <figcaption>Learn in class. Test your game over the board.</figcaption>
        </figure>
      </section>

      <section className="public-section public-academy-story" id="academy">
        <div className="public-story-media">
          <img
            src="/images/shamieh-training.webp"
            alt="Shamieh Chess classroom training session"
            width="1536"
            height="1024"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="public-story-copy">
          <span className="public-eyebrow">STRUCTURED TRAINING</span>
          <h2>A chess pathway built for real progress.</h2>
          <p className="public-lead">
            Good chess development is more than learning moves. Students need the right ideas at the right time, regular practice, feedback, and opportunities to compete.
          </p>
          <p>
            At Shamieh Chess Academy, players progress through clear training levels so each student can build strong fundamentals, improve decision-making, and keep moving forward at an appropriate pace.
          </p>
        </div>
      </section>

      <section className="public-section public-levels-section">
        <div className="public-section-heading">
          <span className="public-eyebrow">FOUR TRAINING LEVELS</span>
          <h2>Start where you are. Build from there.</h2>
          <p>Placement is based on the player&apos;s current level and experience, giving every student a clear next step.</p>
        </div>
        <div className="public-level-grid">
          {levels.map((level, index) => (
            <article className="public-level-card" key={level.name}>
              <span>0{index + 1}</span>
              <h3>{level.name}</h3>
              <p>{level.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-community-band">
        <div className="public-community-photo">
          <img
            src="/images/shamieh-community.webp"
            alt="Shamieh Chess Academy students and coaches together"
            width="1440"
            height="1080"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="public-community-copy">
          <span className="public-eyebrow">MORE THAN LESSONS</span>
          <h2>A place to learn, belong, and compete.</h2>
          <p>
            Chess becomes more meaningful when players share the journey. Students train together, play over the board, take part in events, and become part of an active chess community that celebrates effort as much as results.
          </p>
        </div>
      </section>

      <section className="public-section public-locations" id="locations">
        <div className="public-section-heading">
          <span className="public-eyebrow">ONE ACADEMY · TWO LOCATIONS</span>
          <h2>Train with Shamieh Chess in Saida or Beirut.</h2>
          <p>The same academy philosophy and progression, with the flexibility to choose the location that works best for your family.</p>
        </div>
        <div className="public-location-grid">
          <article className="public-location-card">
            <div className="location-marker">01</div>
            <div>
              <h3>Saida</h3>
              <p>Structured academy classes for players progressing from their first chess lessons to advanced competitive training.</p>
              <Link href="/register">Register for Saida →</Link>
            </div>
          </article>
          <article className="public-location-card">
            <div className="location-marker">02</div>
            <div>
              <h3>Beirut</h3>
              <p>Join the same Shamieh Chess training pathway in Beirut, with level-based coaching and opportunities to compete.</p>
              <Link href="/register">Register for Beirut →</Link>
            </div>
          </article>
        </div>
        <p className="public-location-note">Not sure which level is right? Register first and the academy can place the player in the appropriate class.</p>
      </section>

      <PublicTrainingSchedule rows={(trainingSchedules || []) as any} />

      <section className="public-section public-tournaments" id="tournaments">
        <div className="public-tournament-intro">
          <div className="public-tournament-photo">
            <img
              src="/images/shamieh-achievements.webp"
              alt="Shamieh Chess tournament players with trophies and medals"
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="public-section-heading">
            <span className="public-eyebrow">FROM TRAINING TO COMPETITION</span>
            <h2>Play. Compete. Improve.</h2>
            <p>
              Competition is part of development. Shamieh Chess tournaments give academy students and other players a place to test their preparation, gain experience, and enjoy serious over-the-board chess.
            </p>
            <Link className="btn secondary" href="/tournaments">See all tournaments</Link>
          </div>
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
          <span className="public-eyebrow">YOUR NEXT MOVE</span>
          <h2>Ready to make chess part of the week?</h2>
          <p>Join the academy in Saida or Beirut, or register for an upcoming public tournament.</p>
        </div>
        <div className="public-actions">
          <Link className="btn public-primary" href="/register">Join Shamieh Chess</Link>
          <Link className="btn secondary" href="/tournaments">Tournament Registration</Link>
        </div>
      </section>

      <footer className="public-footer">
        <div><ShamiehLogo /></div>
        <div>Shamieh Chess Academy · Saida & Beirut</div>
        <div className="public-footer-links">
          <a href="https://www.facebook.com/shamieh.chess.academy" target="_blank" rel="noreferrer">Facebook</a>
          <Link href="/login">Student Login</Link>
          <Link href="/tournaments">Tournaments</Link>
        </div>
      </footer>
    </main>
  );
}
