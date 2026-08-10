import Link from "next/link";
import PortalShell from "./PortalShell";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard({ profile }: { profile: any }) {
  const supabase = await createClient();
  const [coachesResult, studentsResult, classesResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("active", true),
  ]);

  const coachCount = coachesResult.count || 0;
  const studentCount = studentsResult.count || 0;
  const classCount = classesResult.count || 0;

  return (
    <PortalShell title={`Welcome, ${profile.full_name}`} role="Admin">
      <div className="grid">
        <div className="card span4">
          <div className="small">Active classes</div>
          <div className="kpi">{classCount}</div>
          <div>Across Saida & Beirut</div>
        </div>
        <div className="card span4">
          <div className="small">Coaches</div>
          <div className="kpi">{coachCount}</div>
          <div>{coachCount} of 6 planned accounts created</div>
        </div>
        <div className="card span4">
          <div className="small">Students</div>
          <div className="kpi">{studentCount}</div>
          <div>Active academy accounts</div>
        </div>

        <div className="card span8">
          <h2>Administration</h2>
          <div className="list">
            <div className="row">
              <div>
                <b>Students</b>
                <div className="small">Create student accounts and control class placement</div>
              </div>
              <Link className="btn" href="/portal/admin/students">Manage</Link>
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
              <button className="btn secondary" disabled>Coming later</button>
            </div>
          </div>
        </div>

        <div className="card span4">
          <h2>Next setup step</h2>
          <p>You can keep adding coaches at any time. For now, start creating student accounts and place each student into the correct class.</p>
          <Link className="btn" href="/portal/admin/students">Set up students</Link>
        </div>
      </div>
    </PortalShell>
  );
}
