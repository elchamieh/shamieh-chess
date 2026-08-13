import Link from "next/link";
import ShamiehLogo from "./ShamiehLogo";

export default function PortalShell({title,role,children}:{title:string;role:string;children:React.ReactNode}) {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="topbar-branding">
          <ShamiehLogo className="topbar-logo" />
          <div className="small">Academy Platform</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {role === "Student" ? <Link className="btn secondary" href="/portal/schedule">My Schedule</Link> : null}
          <span className="pill">{role}</span>
        </div>
      </header>
      <section className="page"><h1>{title}</h1>{children}</section>
    </main>
  );
}
