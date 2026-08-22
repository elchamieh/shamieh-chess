"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ChessHomeworkBoard from "./ChessHomeworkBoard";
import { ChessState, applyUciMove, parseFen } from "@/lib/chess-homework";

export default function InteractiveChessHomework({
  homeworkId,
  positionFen,
  alreadySolved = false,
  initialMistakes = 0,
}: {
  homeworkId: string;
  positionFen: string;
  alreadySolved?: boolean;
  initialMistakes?: number;
}) {
  const router = useRouter();
  const initialState = useMemo(() => parseFen(positionFen), [positionFen]);
  const [state, setState] = useState<ChessState>(initialState);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<"q" | "r" | "b" | "n">("q");
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [solved, setSolved] = useState(alreadySolved);
  const [mistakes, setMistakes] = useState(initialMistakes);
  const [message, setMessage] = useState(alreadySolved ? "Solved ✓" : "Make the best move on the board.");
  const [flipped, setFlipped] = useState(initialState.turn === "b");

  async function playMove(from: string, to: string) {
    const piece = state.board[from];
    if (!piece || busy || solved) return;
    const promotes = piece[1] === "p" && (to[1] === "8" || to[1] === "1");
    const uci = `${from}${to}${promotes ? promotion : ""}`;

    setBusy(true);
    setMessage("Checking…");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("submit_homework_chess_move", {
        p_homework_id: homeworkId,
        p_move: uci,
        p_restart: !started,
      });
      if (error) throw new Error(error.message);
      const result: any = Array.isArray(data) ? data[0] : data;
      if (!result || result.error) throw new Error(result?.error || "Could not check the move.");

      setMistakes(Number(result.mistakes || 0));

      if (!result.correct) {
        setState(initialState);
        setSelectedSquare(null);
        setStarted(false);
        setMessage("Not quite — try again. The position has been reset.");
        return;
      }

      let next = applyUciMove(state, uci);
      if (result.opponent_move) next = applyUciMove(next, String(result.opponent_move));
      setState(next);
      setSelectedSquare(null);
      setStarted(true);

      if (result.solved) {
        setSolved(true);
        setMessage("Solved ✓ Excellent.");
        router.refresh();
      } else {
        setMessage(result.opponent_move ? "Correct. The reply has been played — continue." : "Correct — continue.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check the move.");
    } finally {
      setBusy(false);
    }
  }

  function handleSquare(square: string) {
    if (busy || solved) return;
    const piece = state.board[square];

    if (!selectedSquare) {
      if (piece?.[0] === state.turn) setSelectedSquare(square);
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (piece?.[0] === state.turn) {
      setSelectedSquare(square);
      return;
    }

    void playMove(selectedSquare, square);
  }

  return (
    <div className="card" style={{ boxShadow: "none", marginTop: 14, background: solved ? "#eef6f0" : undefined }}>
      <div className="row" style={{ paddingTop: 0, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <b>Interactive chess position</b>
          <div className="small" style={{ marginTop: 4 }}>
            {initialState.turn === "w" ? "White" : "Black"} to move · {mistakes} mistake{mistakes === 1 ? "" : "s"}
          </div>
        </div>
        <span className="pill">{solved ? "Solved ✓" : "To solve"}</span>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0, maxWidth: 520 }}>
          <ChessHomeworkBoard
            board={state.board}
            selectedSquare={selectedSquare}
            flipped={flipped}
            onSquareClick={handleSquare}
            disabled={busy || solved}
          />
        </div>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <p className="small" style={{ marginTop: 0 }}>{message}</p>
          <label className="field">
            <span>Promotion</span>
            <select className="input" value={promotion} disabled={busy || solved} onChange={(event) => setPromotion(event.target.value as "q" | "r" | "b" | "n")}>
              <option value="q">Queen</option>
              <option value="r">Rook</option>
              <option value="b">Bishop</option>
              <option value="n">Knight</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn secondary" onClick={() => setFlipped((value) => !value)}>Flip board</button>
            {!solved ? (
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setState(initialState);
                  setSelectedSquare(null);
                  setStarted(false);
                  setMessage("Position restarted.");
                }}
              >
                Restart
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
