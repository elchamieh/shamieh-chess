import Link from "next/link";
import AcademyPresenceProvider from "./AcademyPresenceProvider";
import ShamiehLogo from "./ShamiehLogo";

export default function PortalShell({
  title,
  role,
  children,
  studentPresenceStatus = "online",
  studentPresenceGameId = null,
}: {
  title: string;
  role: string;
  children: React.ReactNode;
  studentPresenceStatus?: "online" | "playing";
  studentPresenceGameId?: string | null;
}) {
  const content = (
    <main className="shell">
      <header className="topbar">
        <div className="topbar-branding">
          <ShamiehLogo className="topbar-logo" />
          <div className="small">Academy Platform</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {role === "Student" ? <Link className="btn secondary" href="/portal/play">Play</Link> : null}
          {role === "Student" ? <Link className="btn secondary" href="/portal/schedule">My Schedule</Link> : null}
          {role === "Coach" ? <Link className="btn secondary" href="/portal/coach/attendance">Attendance</Link> : null}
          <span className="pill">{role}</span>
        </div>
      </header>
      <section className="page"><h1>{title}</h1>{children}</section>
    </main>
  );

  if (role !== "Student") return content;

  return (
    <AcademyPresenceProvider status={studentPresenceStatus} gameId={studentPresenceGameId}>
      {content}
    </AcademyPresenceProvider>
  );
}
