import Link from "next/link";
import PortalShell from "./PortalShell";

export default function AdminDashboard({ profile }: { profile: any }) {
  return (
    <PortalShell title={`Welcome, ${profile.full_name}`} role="Admin">
      <div className="grid">
        <div className="card span4">
          <div className="small">Branches</div>
          <div className="kpi">2</div>
          <div>Saida & Beirut</div>
        </div>
        <div className="card span4">
          <div className="small">Levels</div>
          <div className="kpi">4</div>
          <div>Starters → Advanced</div>
        </div>
        <div className="card span4">
          <div className="small">Coaches</div>
          <div className="kpi">6</div>
          <div>Planned academy coaching team</div>
        </div>

        <div className="card span8">
          <h2>Administration</h2>
          <div className="list">
            <div className="row">
              <div>
                <b>Students</b>
                <div className="small">Create students and place them in classes</div>
              </div>
              <button className="btn secondary" disabled>Coming next</button>
            </div>
            <div className="row">
              <div>
                <b>Classes</b>
                <div className="small">Create branch + level teaching groups</div>
              </div>
              <Link className="btn" href="/portal/admin/classes">Manage</Link>
            </div>
            <div className="row">
              <div>
                <b>Coaches & class access</b>
                <div className="small">Create coach accounts and control which classes each coach can access</div>
              </div>
              <Link className="btn" href="/portal/admin/coaches">Manage</Link>
            </div>
            <div className="row">
              <div>
                <b>Tournaments</b>
                <div className="small">Create events and view registrations</div>
              </div>
              <button className="btn secondary" disabled>Coming next</button>
            </div>
          </div>
        </div>

        <div className="card span4">
          <h2>Next setup step</h2>
          <p>Your classes are ready. Create the six coach accounts and assign each coach only to the classes they teach.</p>
          <Link className="btn" href="/portal/admin/coaches">Set up coaches</Link>
        </div>
      </div>
    </PortalShell>
  );
}
