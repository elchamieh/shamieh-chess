import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { updateChessResultsLink } from "./actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function TournamentLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile.approved !== true) redirect("/portal");

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, title, starts_at, registration_type, chess_results_url")
    .order("starts_at", { ascending: false });

  return (
    <PortalShell title="Chess-Results Links" role="Admin">
      <div style={{ marginBottom: 18 }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
      </div>

      {params.saved ? <div className="card" style={{ marginBottom: 18 }}><b>Chess-Results link saved.</b></div> : null}
      {params.error ? <div className="card" style={{ marginBottom: 18 }}><b>Could not save link:</b> {params.error}</div> : null}

      <div className="card">
        <h2>Tournament registration lists</h2>
        <p className="small">Paste the official Chess-Results.com link for each event. Leave the field empty and save to remove the public button.</p>
        <div className="list" style={{ marginTop: 14 }}>
          {(tournaments || []).map((tournament: any) => (
            <div className="card" key={tournament.id} style={{ boxShadow: "none" }}>
              <div className="row" style={{ alignItems: "flex-start" }}>
                <div>
                  <b>{tournament.title}</b>
                  <div className="small" style={{ marginTop: 4 }}>
                    {formatDate(tournament.starts_at)} · {tournament.registration_type === "team" ? "Team event" : "Individual event"}
                  </div>
                </div>
                {tournament.chess_results_url ? (
                  <a className="btn secondary" href={tournament.chess_results_url} target="_blank" rel="noopener noreferrer">Open current link ↗</a>
                ) : null}
              </div>
              <form action={updateChessResultsLink} style={{ marginTop: 12 }}>
                <input type="hidden" name="tournament_id" value={tournament.id} />
                <label className="field">
                  <span>Chess-Results URL</span>
                  <input
                    className="input"
                    type="url"
                    name="chess_results_url"
                    defaultValue={tournament.chess_results_url || ""}
                    placeholder="https://s3.chess-results.com/tnr....aspx?lan=1"
                  />
                </label>
                <button className="btn" type="submit">Save link</button>
              </form>
            </div>
          ))}
          {!tournaments?.length ? <p className="small">No tournaments created yet.</p> : null}
        </div>
      </div>
    </PortalShell>
  );
}
