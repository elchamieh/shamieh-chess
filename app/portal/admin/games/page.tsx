import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { hasAdminAccess } from "@/lib/access";
import { formatTimeControl, gameResultLabel } from "@/lib/live-chess";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminGamesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();
  if (!hasAdminAccess(profile)) redirect("/portal");

  const { data: games } = await supabase
    .from("live_games")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const active = (games || []).filter((game: any) => game.status === "active");
  const completed = (games || []).filter((game: any) => game.status === "completed");

  return (
    <PortalShell title="Academy Games" role="Admin">
      <div style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      <div className="grid">
        <div className="card span4"><div className="small">Games shown</div><div className="kpi">{games?.length || 0}</div></div>
        <div className="card span4"><div className="small">Playing now</div><div className="kpi">{active.length}</div></div>
        <div className="card span4"><div className="small">Completed</div><div className="kpi">{completed.length}</div></div>

        <div className="card span12">
          <h2>Student games</h2>
          <p className="small">Review live and completed academy games. The full PGN is preserved for completed games.</p>
          {!games?.length ? <p className="small">No academy games yet.</p> : (
            <div className="list">
              {games.map((game: any) => (
                <div className="card" key={game.id} style={{ boxShadow: "none" }}>
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <b>{game.white_name} vs {game.black_name}</b>
                        <span className="pill">{game.status === "active" ? "Playing" : "Finished"}</span>
                      </div>
                      <div className="small" style={{ marginTop: 5 }}>
                        {formatDate(game.created_at)} · {formatTimeControl(game.initial_seconds, game.increment_seconds)} · {Array.isArray(game.moves) ? game.moves.length : 0} moves
                      </div>
                      <div className="small" style={{ marginTop: 5 }}>{gameResultLabel(game)}</div>
                    </div>
                  </div>
                  {game.pgn ? (
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: "pointer", fontWeight: 700 }}>View PGN</summary>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{game.pgn}</pre>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
