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

  const [{ data: players }, { data: challenges }, { data: liveGames }, { data: myGames }] = await Promise.all([
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
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("live_games")
      .select("*")
      .or(`white_id.eq.${profile.id},black_id.eq.${profile.id}`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const gamesById = new Map<string, any>();
  for (const game of [...(liveGames || []), ...(myGames || [])]) gamesById.set(game.id, game);

  return (
    <PortalShell title="Academy Play" role="Student">
      <div style={{ marginBottom: 18 }}>
        <p>See who is online, challenge students from any Shamieh class, play live games, or watch academy games already in progress.</p>
      </div>
      <AcademyPlayLobby
        studentId={profile.id}
        players={(players || []) as any}
        initialChallenges={(challenges || []) as any}
        initialGames={[...gamesById.values()] as any}
      />
    </PortalShell>
  );
}
