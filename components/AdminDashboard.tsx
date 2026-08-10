import Link from "next/link";
import PortalShell from "./PortalShell";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard({ profile }: { profile: any }) {
  const supabase = await createClient();
  const [coachesResult, studentsResult, pendingResult, classesResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach").eq("approved", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("approved", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("approved", false),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("active", true),
  ]);

  const coachCount = coachesResult.count || 0;
  const studentCount = studentsResult.count || 0;
  const pendingCount = pendingResult.count || 0;
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
          <div className="small">Approved students</div>
          <div className="kpi">{studentCount}</div>
          <div>{pendingCount ? `${pendingCount} registration${pendingCount === 1 ? "" : "s"} awaiting approval` : "No registrations awaiting approval"}</div>
        </div>

        <div className="card span8">
          <h2>Administration</h2>
          <div className="list">
            <div className="row">
              <div>
                <b>Students</b>
                <div className="small">Approve self-registrations, create accounts manually, and control class placement</div>
              </div>
              <Link className="btn" href="/portal/admin/students">Manage{pendingCount ? ` (${pendingCount})` : ""}</Link>
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
                <div className="small">Create events, open or close registration, and view student registrations</div>
              </div>
              <Link className="btn" href="/portal/admin/tournaments">Manage</Link>
            </div>
          </div>
        </div>

        <div className="card span4">
          <h2>Tournaments</h2>
          <p>Create the next academy event and students will be able to register from their own dashboard.</p>
          <Link className="btn" href="/portal/admin/tournaments">Create tournament</Link>
        </div>
      </div>
    </PortalShell>
  );
}
