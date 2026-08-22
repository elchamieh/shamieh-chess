"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAcademyPresence } from "./AcademyPresenceProvider";
import {
  AcademyPlayer,
  LIVE_TIME_CONTROLS,
  LiveChallenge,
  LiveGame,
  formatTimeControl,
  gameResultLabel,
} from "@/lib/live-chess";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AcademyPlayLobby({
  studentId,
  players,
  initialChallenges,
  initialGames,
}: {
  studentId: string;
  players: AcademyPlayer[];
  initialChallenges: LiveChallenge[];
  initialGames: LiveGame[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { connected, online } = useAcademyPresence();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [games, setGames] = useState(initialGames);
  const [timeControl, setTimeControl] = useState("300-3");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const playerById = useMemo(() => new Map(players.map((player) => [player.user_id, player])), [players]);
  const isMyGame = useCallback((game: LiveGame) => game.white_id === studentId || game.black_id === studentId, [studentId]);
  const myActiveGame = games.find((game) => game.status === "active" && isMyGame(game));
  const liveGames = games.filter((game) => game.status === "active");
  const myGames = games.filter(isMyGame);

  const refresh = useCallback(async () => {
    const [{ data: challengeRows }, { data: liveGameRows }, { data: myGameRows }] = await Promise.all([
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
        .or(`white_id.eq.${studentId},black_id.eq.${studentId}`)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const gamesById = new Map<string, LiveGame>();
    for (const game of [...(liveGameRows || []), ...(myGameRows || [])] as LiveGame[]) gamesById.set(game.id, game);
    setChallenges((challengeRows || []) as LiveChallenge[]);
    setGames([...gamesById.values()]);
  }, [studentId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`academy-play-updates:${studentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_challenges" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "live_games" }, (payload) => {
        void refresh();
        const next = payload.new as LiveGame | undefined;
        if (next?.id && next.status === "active" && (next.white_id === studentId || next.black_id === studentId)) {
          router.push(`/portal/play/${next.id}`);
        }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [refresh, router, studentId, supabase]);

  async function invoke(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("live-chess-action", { body });
    if (error) throw new Error(error.message || "Could not reach live chess service.");
    if (data?.error) throw new Error(String(data.error));
    return data;
  }

  async function sendChallenge(opponentId: string) {
    const [initial, increment] = timeControl.split("-").map(Number);
    setBusyId(opponentId);
    setMessage(null);
    try {
      await invoke({ action: "challenge", opponent_id: opponentId, initial_seconds: initial, increment_seconds: increment });
      setMessage("Challenge sent.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send challenge.");
    } finally {
      setBusyId(null);
    }
  }

  async function respond(challengeId: string, response: "accept" | "decline") {
    setBusyId(challengeId);
    setMessage(null);
    try {
      const data = await invoke({ action: "respond", challenge_id: challengeId, response });
      if (data?.game?.id) {
        router.push(`/portal/play/${data.game.id}`);
        return;
      }
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not respond to challenge.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(challengeId: string) {
    setBusyId(challengeId);
    setMessage(null);
    try {
      await invoke({ action: "cancel", challenge_id: challengeId });
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel challenge.");
    } finally {
      setBusyId(null);
    }
  }

  const onlinePlayers = players
    .filter((player) => player.user_id !== studentId && Boolean(online[player.user_id]))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  const allOthers = players
    .filter((player) => player.user_id !== studentId)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  const incoming = challenges.filter((challenge) => challenge.challenged_id === studentId);
  const outgoing = challenges.filter((challenge) => challenge.challenger_id === studentId);

  return (
    <div className="grid">
      {message ? <div className="card span12"><b>{message}</b></div> : null}

      {myActiveGame ? (
        <div className="card span12">
          <div className="row">
            <div>
              <span className="pill">Your game in progress</span>
              <h2 style={{ marginTop: 10 }}>{myActiveGame.white_name} vs {myActiveGame.black_name}</h2>
              <div className="small">{formatTimeControl(myActiveGame.initial_seconds, myActiveGame.increment_seconds)}</div>
            </div>
            <Link className="btn" href={`/portal/play/${myActiveGame.id}`}>Resume game</Link>
          </div>
        </div>
      ) : null}

      <div className="card span12">
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div>
            <h2>Games being played</h2>
            <p className="small">Join any academy game as a spectator. Watching is read-only and does not affect the players or clocks.</p>
          </div>
          <span className="pill">{liveGames.length} live</span>
        </div>
        {!liveGames.length ? (
          <p className="small">No academy games are being played right now.</p>
        ) : (
          <div className="list">
            {liveGames.map((game) => {
              const mine = isMyGame(game);
              return (
                <div className="row" key={game.id}>
                  <div>
                    <b>{game.white_name} vs {game.black_name}</b>
                    <div className="small" style={{ marginTop: 3 }}>
                      {formatTimeControl(game.initial_seconds, game.increment_seconds)} · {(game.moves || []).length} move{(game.moves || []).length === 1 ? "" : "s"} played
                    </div>
                  </div>
                  <Link className={mine ? "btn" : "btn secondary"} href={`/portal/play/${game.id}`}>{mine ? "Resume" : "Watch"}</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card span7">
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div>
            <h2>Online now</h2>
            <p className="small">Challenge any approved Shamieh student, even if they are in another class or branch.</p>
          </div>
          <span className="pill">{connected ? `${onlinePlayers.length} online` : "Connecting…"}</span>
        </div>

        <label className="field" style={{ maxWidth: 220 }}>
          <span>Time control</span>
          <select className="input" value={timeControl} onChange={(event) => setTimeControl(event.target.value)} disabled={Boolean(myActiveGame)}>
            {LIVE_TIME_CONTROLS.map((control) => (
              <option key={control.label} value={`${control.initialSeconds}-${control.incrementSeconds}`}>{control.label}</option>
            ))}
          </select>
        </label>

        {!onlinePlayers.length ? (
          <p className="small">No other academy students are online right now.</p>
        ) : (
          <div className="list">
            {onlinePlayers.map((player) => {
              const presence = online[player.user_id];
              const playing = presence?.status === "playing";
              const watchGameId = playing ? presence?.game_id : null;
              return (
                <div className="row" key={player.user_id}>
                  <div>
                    <b>{player.display_name}</b>
                    <div className="small" style={{ marginTop: 3 }}>{playing ? "Playing now" : "Online"}</div>
                  </div>
                  {watchGameId ? (
                    <Link className="btn secondary" href={`/portal/play/${watchGameId}`}>Watch</Link>
                  ) : (
                    <button className="btn" type="button" disabled={playing || Boolean(myActiveGame) || busyId === player.user_id} onClick={() => void sendChallenge(player.user_id)}>
                      {playing ? "Busy" : busyId === player.user_id ? "Sending…" : "Challenge"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card span5">
        <h2>Challenges</h2>
        {!incoming.length && !outgoing.length ? <p className="small">No pending challenges.</p> : null}
        {incoming.map((challenge) => (
          <div className="card" key={challenge.id} style={{ boxShadow: "none", marginBottom: 10 }}>
            <b>{playerById.get(challenge.challenger_id)?.display_name || "Academy student"}</b>
            <div className="small" style={{ marginTop: 4 }}>{formatTimeControl(challenge.initial_seconds, challenge.increment_seconds)} · expires shortly</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button className="btn" type="button" disabled={busyId === challenge.id || Boolean(myActiveGame)} onClick={() => void respond(challenge.id, "accept")}>Accept</button>
              <button className="btn secondary" type="button" disabled={busyId === challenge.id} onClick={() => void respond(challenge.id, "decline")}>Decline</button>
            </div>
          </div>
        ))}
        {outgoing.map((challenge) => (
          <div className="row" key={challenge.id}>
            <div>
              <b>{playerById.get(challenge.challenged_id)?.display_name || "Academy student"}</b>
              <div className="small">Waiting · {formatTimeControl(challenge.initial_seconds, challenge.increment_seconds)}</div>
            </div>
            <button className="btn secondary" type="button" disabled={busyId === challenge.id} onClick={() => void cancel(challenge.id)}>Cancel</button>
          </div>
        ))}
      </div>

      <div className="card span6">
        <h2>All academy students</h2>
        <p className="small">You can challenge students from any class. Students currently playing can be watched live.</p>
        <div className="list" style={{ maxHeight: 430, overflowY: "auto" }}>
          {allOthers.map((player) => {
            const presence = online[player.user_id];
            const isOnline = Boolean(presence);
            const playing = presence?.status === "playing";
            const watchGameId = playing ? presence?.game_id : null;
            return (
              <div className="row" key={player.user_id}>
                <div>
                  <b>{player.display_name}</b>
                  <div className="small">{playing ? "● Playing" : isOnline ? "● Online" : "Offline"}</div>
                </div>
                {watchGameId ? (
                  <Link className="btn secondary" href={`/portal/play/${watchGameId}`}>Watch</Link>
                ) : (
                  <button className="btn secondary" type="button" disabled={Boolean(myActiveGame) || playing || busyId === player.user_id} onClick={() => void sendChallenge(player.user_id)}>
                    Challenge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card span6">
        <h2>My games</h2>
        {!myGames.length ? <p className="small">No academy games played yet.</p> : (
          <div className="list">
            {myGames.map((game) => {
              const opponent = game.white_id === studentId ? game.black_name : game.white_name;
              return (
                <div className="row" key={game.id}>
                  <div>
                    <b>vs {opponent}</b>
                    <div className="small" style={{ marginTop: 3 }}>{formatDate(game.created_at)} · {formatTimeControl(game.initial_seconds, game.increment_seconds)}</div>
                    <div className="small" style={{ marginTop: 3 }}>{gameResultLabel(game)}</div>
                  </div>
                  <Link className="btn secondary" href={`/portal/play/${game.id}`}>{game.status === "active" ? "Resume" : "Replay"}</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
