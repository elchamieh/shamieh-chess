import { notFound, redirect } from "next/navigation";
import LiveChessGame from "@/components/LiveChessGame";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";

export default async function LiveGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, approved, frozen")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || profile.approved !== true || profile.frozen === true) redirect("/portal");

  const { data: game } = await supabase
    .from("live_games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (!game) notFound();

  const isParticipant = game.white_id === profile.id || game.black_id === profile.id;

  return (
    <PortalShell
      title={`${game.white_name} vs ${game.black_name}`}
      role="Student"
      studentPresenceStatus={isParticipant && game.status === "active" ? "playing" : "online"}
      studentPresenceGameId={isParticipant && game.status === "active" ? game.id : null}
    >
      <LiveChessGame studentId={profile.id} initialGame={game as any} />
    </PortalShell>
  );
}
