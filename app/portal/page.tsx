import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "@/components/AdminDashboard";
import CoachDashboard from "@/components/CoachDashboard";
import StudentDashboard from "@/components/StudentDashboard";

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role").eq("id", user.id).single();
  if (!profile) return <main className="page"><div className="card">Profile not configured yet.</div></main>;
  if (profile.role === "admin") return <AdminDashboard profile={profile} />;
  if (profile.role === "coach") return <CoachDashboard profile={profile} />;
  return <StudentDashboard profile={profile} />;
}
