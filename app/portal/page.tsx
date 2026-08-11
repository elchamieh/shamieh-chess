import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "@/components/AdminDashboard";
import CoachDashboard from "@/components/CoachDashboard";
import StudentDashboard from "@/components/StudentDashboard";
import ShamiehLogo from "@/components/ShamiehLogo";

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, approved, date_of_birth, fide_id, phone, frozen")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <main className="login">
        <div className="card login-card">
          <ShamiehLogo className="login-logo" />
          <div>Profile not configured yet.</div>
        </div>
      </main>
    );
  }

  if (!profile.approved) {
    return (
      <main className="login">
        <div className="card login-card">
          <ShamiehLogo className="login-logo" />
          <span className="pill">Pending Approval</span>
          <h1 style={{ marginTop: 14 }}>Registration received</h1>
          <p>Your account has been created, but academy access is not active yet.</p>
          <p className="small">The academy administrator must approve your registration and place you into a class first.</p>
        </div>
      </main>
    );
  }

  if (profile.role === "student" && profile.frozen) {
    return (
      <main className="login">
        <div className="card login-card">
          <ShamiehLogo className="login-logo" />
          <span className="pill">Account Frozen</span>
          <h1 style={{ marginTop: 14 }}>Your academy account is currently frozen</h1>
          <p>Your Shamieh Chess records and class placement are preserved, but portal access is temporarily disabled.</p>
          <p className="small">Please contact Shamieh Chess Academy if you believe the account should be reactivated.</p>
        </div>
      </main>
    );
  }

  if (profile.role === "admin") return <AdminDashboard profile={profile} />;
  if (profile.role === "coach") return <CoachDashboard profile={profile} />;
  return <StudentDashboard profile={profile} />;
}
