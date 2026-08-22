import { redirect } from "next/navigation";
import AcademyPlayLobby from "@/components/AcademyPlayLobby";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";

export default async function AcademyPlayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, approved, frozen")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || profile.approved !== true || profile.frozen === true) redirect("/portal");

  const [{ data: players }, { data: challenges }, { data: games }] = await Promise.all([
    supabase
      .from("academy_player_directory")
      .select("user_id, display_name")
      .order("display_name", { ascending: true }),
    supabase
      .from("live_challenges")
      .select("*")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("live_games")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <PortalShell title="Academy Play" role="Student">
      <div style={{ marginBottom: 18 }}>
        <p>See who is online, challenge students from any Shamieh class, and play live games directly on the academy website.</p>
      </div>
      <AcademyPlayLobby
        studentId={profile.id}
        players={(players || []) as any}
        initialChallenges={(challenges || []) as any}
        initialGames={(games || []) as any}
      />
    </PortalShell>
  );
}
