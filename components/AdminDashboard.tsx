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
                <b>Training schedule</b>
                <div className="small">Choose a class and publish the exact dates and times of its training sessions</div>
              </div>
              <Link className="btn" href="/portal/admin/schedule">Manage</Link>
            </div>
            <div className="row">
              <div>
                <b>Attendance</b>
                <div className="small">Review attendance submitted by coaches across all classes and months</div>
              </div>
              <Link className="btn" href="/portal/admin/attendance">View</Link>
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
                <b>Homework</b>
                <div className="small">See all class rosters, coach homework, and the students receiving each assignment</div>
              </div>
              <Link className="btn" href="/portal/admin/homework">View</Link>
            </div>
            <div className="row">
              <div>
                <b>Tournaments</b>
                <div className="small">Create events, manage registrations, and attach official Chess-Results lists</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Link className="btn" href="/portal/admin/tournaments">Manage</Link>
                <Link className="btn secondary" href="/portal/admin/tournament-links">Chess-Results</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="card span4">
          <h2>Attendance</h2>
          <p>See which sessions have been marked and review Present, Absent, and Excused records.</p>
          <Link className="btn" href="/portal/admin/attendance">View attendance</Link>
        </div>
      </div>
    </PortalShell>
  );
}
