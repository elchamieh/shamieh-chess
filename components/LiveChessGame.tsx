"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ChessHomeworkBoard from "./ChessHomeworkBoard";
import { createClient } from "@/lib/supabase/client";
import { parseFen } from "@/lib/chess-homework";
import { LiveGame, formatChessClock, formatTimeControl, gameResultLabel } from "@/lib/live-chess";

export default function LiveChessGame({ studentId, initialGame }: { studentId: string; initialGame: LiveGame }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [game, setGame] = useState(initialGame);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<"q" | "r" | "b" | "n">("q");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const timeoutClaimed = useRef(false);
  const refreshedAfterFinish = useRef(initialGame.status === "completed");

  const state = useMemo(() => parseFen(game.fen), [game.fen]);
  const myColor = game.white_id === studentId ? "w" : "b";
  const myTurn = game.status === "active" && state.turn === myColor;

  useEffect(() => {
    const channel = supabase
      .channel(`live-game:${game.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_games", filter: `id=eq.${game.id}` },
        (payload) => {
          const next = payload.new as LiveGame;
          setGame(next);
          setSelectedSquare(null);
          timeoutClaimed.current = false;
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [game.id, supabase]);

  useEffect(() => {
    if (game.status !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [game.status]);

  useEffect(() => {
    if (game.status === "completed" && !refreshedAfterFinish.current) {
      refreshedAfterFinish.current = true;
      router.refresh();
    }
  }, [game.status, router]);

  function displayedClock(color: "w" | "b") {
    const stored = color === "w" ? Number(game.white_time_ms) : Number(game.black_time_ms);
    if (game.status !== "active" || state.turn !== color) return stored;
    const elapsed = Math.max(0, now - new Date(game.turn_started_at).getTime());
    return Math.max(0, stored - elapsed);
  }

  const whiteClock = displayedClock("w");
  const blackClock = displayedClock("b");

  async function invoke(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke("live-chess-action", { body });
    if (error) throw new Error(error.message || "Could not reach live chess service.");
    if (data?.game) setGame(data.game as LiveGame);
    if (data?.error) throw new Error(String(data.error));
    return data;
  }

  useEffect(() => {
    if (game.status !== "active" || timeoutClaimed.current) return;
    const activeClock = state.turn === "w" ? whiteClock : blackClock;
    if (activeClock > 0) return;
    timeoutClaimed.current = true;
    void invoke({ action: "claim_timeout", game_id: game.id }).catch(() => {
      timeoutClaimed.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blackClock, game.id, game.status, state.turn, whiteClock]);

  async function playMove(from: string, to: string) {
    const piece = state.board[from];
    if (!piece || !myTurn || busy) return;
    const promotes = piece[1] === "p" && (to[1] === "8" || to[1] === "1");
    const uci = `${from}${to}${promotes ? promotion : ""}`;
    setBusy(true);
    setMessage("Checking move…");
    try {
      await invoke({ action: "move", game_id: game.id, move: uci });
      setMessage(null);
      setSelectedSquare(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Move could not be played.");
      setSelectedSquare(null);
    } finally {
      setBusy(false);
    }
  }

  function handleSquare(square: string) {
    if (!myTurn || busy || game.status !== "active") return;
    const piece = state.board[square];

    if (!selectedSquare) {
      if (piece?.[0] === myColor) setSelectedSquare(square);
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (piece?.[0] === myColor) {
      setSelectedSquare(square);
      return;
    }

    void playMove(selectedSquare, square);
  }

  async function resign() {
    if (game.status !== "active" || busy) return;
    if (!window.confirm("Resign this game?")) return;
    setBusy(true);
    setMessage(null);
    try {
      await invoke({ action: "resign", game_id: game.id });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resign.");
    } finally {
      setBusy(false);
    }
  }

  const moveRows: Array<{ number: number; white?: string; black?: string }> = [];
  for (let index = 0; index < (game.moves || []).length; index += 2) {
    moveRows.push({
      number: index / 2 + 1,
      white: game.moves[index]?.san || game.moves[index]?.uci,
      black: game.moves[index + 1]?.san || game.moves[index + 1]?.uci,
    });
  }

  return (
    <div className="grid">
      <div className="card span8">
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div className="card" style={{ boxShadow: "none", marginBottom: 10, padding: 12, background: state.turn === "b" && game.status === "active" ? "#eef6f0" : undefined }}>
            <div className="row" style={{ paddingTop: 0 }}>
              <div><b>{game.black_name}</b><div className="small">Black</div></div>
              <div style={{ fontSize: 30, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatChessClock(blackClock)}</div>
            </div>
          </div>

          <ChessHomeworkBoard
            board={state.board}
            selectedSquare={selectedSquare}
            flipped={myColor === "b"}
            onSquareClick={handleSquare}
            disabled={!myTurn || busy || game.status !== "active"}
          />

          <div className="card" style={{ boxShadow: "none", marginTop: 10, padding: 12, background: state.turn === "w" && game.status === "active" ? "#eef6f0" : undefined }}>
            <div className="row" style={{ paddingTop: 0 }}>
              <div><b>{game.white_name}</b><div className="small">White</div></div>
              <div style={{ fontSize: 30, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatChessClock(whiteClock)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card span4">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span className="pill">{formatTimeControl(game.initial_seconds, game.increment_seconds)}</span>
          <span className="pill">You are {myColor === "w" ? "White" : "Black"}</span>
        </div>

        {game.status === "active" ? (
          <>
            <h2>{myTurn ? "Your move" : "Opponent's move"}</h2>
            <p className="small">Select one of your pieces, then select its destination square. Illegal moves are rejected by the server.</p>
            <label className="field">
              <span>Promotion piece</span>
              <select className="input" value={promotion} onChange={(event) => setPromotion(event.target.value as "q" | "r" | "b" | "n")}> 
                <option value="q">Queen</option>
                <option value="r">Rook</option>
                <option value="b">Bishop</option>
                <option value="n">Knight</option>
              </select>
            </label>
            {message ? <div className="small" style={{ marginBottom: 12 }}><b>{message}</b></div> : null}
            <button className="btn secondary" type="button" onClick={() => void resign()} disabled={busy}>Resign</button>
          </>
        ) : (
          <>
            <span className="pill">Game finished</span>
            <h2 style={{ marginTop: 12 }}>{gameResultLabel(game)}</h2>
            {game.pgn ? <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.5, maxHeight: 260, overflowY: "auto" }}>{game.pgn}</pre> : null}
          </>
        )}

        <div style={{ marginTop: 18 }}>
          <b>Moves</b>
          {!moveRows.length ? <p className="small">No moves yet.</p> : (
            <div style={{ maxHeight: 260, overflowY: "auto", marginTop: 8 }}>
              {moveRows.map((row) => (
                <div key={row.number} style={{ display: "grid", gridTemplateColumns: "42px 1fr 1fr", gap: 8, padding: "5px 0", borderBottom: "1px solid #e7e7e7" }}>
                  <span className="small">{row.number}.</span><span>{row.white || ""}</span><span>{row.black || ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}><Link className="btn secondary" href="/portal/play">← Back to Academy Play</Link></div>
      </div>
    </div>
  );
}
