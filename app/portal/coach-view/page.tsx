import { redirect } from "next/navigation";
import CoachDashboard from "@/components/CoachDashboard";
import { createClient } from "@/lib/supabase/server";

export default async function CoachViewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, approved, date_of_birth, fide_id, phone, frozen, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.approved || profile.role !== "coach" || profile.frozen === true) redirect("/portal");

  return <CoachDashboard profile={profile} />;
}
