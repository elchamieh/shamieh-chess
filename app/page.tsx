import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <ShamiehLogo className="topbar-logo" />
        <nav className="nav">
          <span>Academy</span><span>Saida</span><span>Beirut</span><span>Tournaments</span><span>Shop</span>
          <Link href="/login" className="btn secondary">Student Login</Link>
        </nav>
      </header>
      <section className="page">
        <div className="card" style={{ padding: 40 }}>
          <span className="pill">Public Website — v0.1</span>
          <h1 style={{ fontSize: 48, marginTop: 16 }}>Think. Play. Enjoy Chess.</h1>
          <p style={{ maxWidth: 720, fontSize: 18, color: "var(--muted)" }}>
            Shamieh Chess Academy in Saida and Beirut. Classes for Starters, Beginners, Intermediate and Advanced players, tournaments and chess equipment.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <Link className="btn" href="/register">Register as a Student</Link>
            <Link className="btn secondary" href="/login">Open Academy Platform</Link>
            <span className="btn secondary">View Tournaments</span>
          </div>
        </div>
      </section>
    </main>
  );
}
