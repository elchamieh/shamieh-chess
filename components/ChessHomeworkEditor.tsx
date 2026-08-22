"use client";

import { useMemo, useState } from "react";
import ChessHomeworkBoard from "./ChessHomeworkBoard";
import {
  ChessPiece,
  ChessState,
  EMPTY_FEN,
  PIECE_GLYPHS,
  STARTING_FEN,
  applyUciMove,
  parseFen,
  stateToFen,
} from "@/lib/chess-homework";

const PALETTE: ChessPiece[] = ["wk", "wq", "wr", "wb", "wn", "wp", "bk", "bq", "br", "bb", "bn", "bp"];

function cloneState(state: ChessState): ChessState {
  return { ...state, board: { ...state.board } };
}

export default function ChessHomeworkEditor() {
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<ChessState>(() => parseFen(STARTING_FEN));
  const [mode, setMode] = useState<"setup" | "solution">("setup");
  const [tool, setTool] = useState<ChessPiece | "erase" | "move">("move");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [solutionState, setSolutionState] = useState<ChessState>(() => parseFen(STARTING_FEN));
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [promotion, setPromotion] = useState<"q" | "r" | "b" | "n">("q");
  const [flipped, setFlipped] = useState(false);
  const [fenInput, setFenInput] = useState(STARTING_FEN);
  const [message, setMessage] = useState<string | null>(null);

  const setupFen = useMemo(() => stateToFen(setup), [setup]);

  function loadFen(value: string) {
    try {
      const parsed = parseFen(value);
      setSetup(parsed);
      setSolutionState(cloneState(parsed));
      setSolutionMoves([]);
      setSelectedSquare(null);
      setFenInput(stateToFen(parsed));
      setMode("setup");
      setMessage("Position loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid FEN.");
    }
  }

  function setPreset(fen: string) {
    loadFen(fen);
    setMessage(null);
  }

  function handleSetupSquare(square: string) {
    const next = cloneState(setup);
    if (tool === "erase") {
      delete next.board[square];
      setSetup(next);
      setSelectedSquare(null);
      setSolutionMoves([]);
      return;
    }

    if (tool !== "move") {
      next.board[square] = tool;
      setSetup(next);
      setSelectedSquare(null);
      setSolutionMoves([]);
      return;
    }

    if (!selectedSquare) {
      if (next.board[square]) setSelectedSquare(square);
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    const piece = next.board[selectedSquare];
    if (piece) {
      delete next.board[selectedSquare];
      next.board[square] = piece;
      setSetup(next);
      setSolutionMoves([]);
    }
    setSelectedSquare(null);
  }

  function handleSolutionSquare(square: string) {
    if (!selectedSquare) {
      if (solutionState.board[square]) setSelectedSquare(square);
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    const piece = solutionState.board[selectedSquare];
    if (!piece) {
      setSelectedSquare(null);
      return;
    }

    const promotes = piece[1] === "p" && (square[1] === "8" || square[1] === "1");
    const uci = `${selectedSquare}${square}${promotes ? promotion : ""}`;
    try {
      const next = applyUciMove(solutionState, uci);
      setSolutionState(next);
      setSolutionMoves((moves) => [...moves, uci]);
      setSelectedSquare(null);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not record that move.");
      setSelectedSquare(null);
    }
  }

  function startSolution() {
    setSolutionState(cloneState(setup));
    setSolutionMoves([]);
    setSelectedSquare(null);
    setMode("solution");
    setMessage("Record the exact correct line. The student will control the side that moves first; replies are played automatically.");
  }

  function undoSolution() {
    const remaining = solutionMoves.slice(0, -1);
    let next = cloneState(setup);
    for (const move of remaining) next = applyUciMove(next, move);
    setSolutionMoves(remaining);
    setSolutionState(next);
    setSelectedSquare(null);
  }

  if (!enabled) {
    return (
      <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
        <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={false} onChange={() => setEnabled(true)} />
          <span><b>Add interactive chess position</b><span className="small" style={{ display: "block" }}>Optional · students solve directly on a chessboard</span></span>
        </label>
        <input type="hidden" name="interactive_position_fen" value="" readOnly />
        <input type="hidden" name="interactive_solution_json" value="" readOnly />
      </div>
    );
  }

  const current = mode === "setup" ? setup : solutionState;

  return (
    <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
      <input type="hidden" name="interactive_position_fen" value={setupFen} readOnly />
      <input type="hidden" name="interactive_solution_json" value={JSON.stringify(solutionMoves)} readOnly />

      <div className="row" style={{ paddingTop: 0, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Interactive Chess Position</h3>
          <div className="small">{mode === "setup" ? "1. Build the starting position" : "2. Record the correct solution"}</div>
        </div>
        <button type="button" className="btn secondary" onClick={() => setEnabled(false)}>Remove position</button>
      </div>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0, maxWidth: 520 }}>
          <ChessHomeworkBoard
            board={current.board}
            selectedSquare={selectedSquare}
            flipped={flipped}
            onSquareClick={mode === "setup" ? handleSetupSquare : handleSolutionSquare}
          />
        </div>

        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          {mode === "setup" ? (
            <>
              <div className="small" style={{ marginBottom: 6 }}><b>Position tools</b></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" className={`btn ${tool === "move" ? "" : "secondary"}`} onClick={() => { setTool("move"); setSelectedSquare(null); }}>Move</button>
                <button type="button" className={`btn ${tool === "erase" ? "" : "secondary"}`} onClick={() => { setTool("erase"); setSelectedSquare(null); }}>Erase</button>
                {PALETTE.map((piece) => (
                  <button
                    type="button"
                    key={piece}
                    className={`btn ${tool === piece ? "" : "secondary"}`}
                    title={`Place ${piece}`}
                    onClick={() => { setTool(piece); setSelectedSquare(null); }}
                    style={{ fontSize: 24, minWidth: 44, padding: "5px 8px" }}
                  >
                    {PIECE_GLYPHS[piece]}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button type="button" className="btn secondary" onClick={() => setPreset(STARTING_FEN)}>Starting position</button>
                <button type="button" className="btn secondary" onClick={() => setPreset(EMPTY_FEN)}>Clear board</button>
                <button type="button" className="btn secondary" onClick={() => setFlipped((value) => !value)}>Flip board</button>
              </div>

              <label className="field" style={{ marginTop: 12 }}>
                <span>Side to move</span>
                <select
                  className="input"
                  value={setup.turn}
                  onChange={(event) => {
                    setSetup((state) => ({ ...state, turn: event.target.value === "b" ? "b" : "w" }));
                    setSolutionMoves([]);
                  }}
                >
                  <option value="w">White to move</option>
                  <option value="b">Black to move</option>
                </select>
              </label>

              <label className="field">
                <span>FEN <span className="small">(optional import)</span></span>
                <textarea className="input" rows={3} value={fenInput} onChange={(event) => setFenInput(event.target.value)} />
              </label>
              <button type="button" className="btn secondary" onClick={() => loadFen(fenInput)}>Load FEN</button>

              <div style={{ marginTop: 14 }}>
                <button type="button" className="btn" onClick={startSolution}>Set solution →</button>
              </div>
            </>
          ) : (
            <>
              <p className="small">Play the full correct line on the board. The first side is the student&apos;s side; every following opponent move will be played automatically for them.</p>
              <label className="field">
                <span>Promotion piece</span>
                <select className="input" value={promotion} onChange={(event) => setPromotion(event.target.value as "q" | "r" | "b" | "n")}>
                  <option value="q">Queen</option>
                  <option value="r">Rook</option>
                  <option value="b">Bishop</option>
                  <option value="n">Knight</option>
                </select>
              </label>

              <div className="card" style={{ boxShadow: "none", padding: 12, marginBottom: 10 }}>
                <div className="small">Recorded solution</div>
                <div style={{ marginTop: 5, fontFamily: "monospace", wordBreak: "break-word" }}>
                  {solutionMoves.length ? solutionMoves.join("  ") : "No moves recorded yet."}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn secondary" onClick={undoSolution} disabled={!solutionMoves.length}>Undo move</button>
                <button type="button" className="btn secondary" onClick={() => { setMode("setup"); setSelectedSquare(null); }}>← Edit position</button>
                <button type="button" className="btn secondary" onClick={() => setFlipped((value) => !value)}>Flip board</button>
              </div>

              {!solutionMoves.length ? <div className="small" style={{ marginTop: 10 }}>Record at least one move before publishing.</div> : null}
            </>
          )}

          {message ? <div className="small" style={{ marginTop: 12 }}>{message}</div> : null}
        </div>
      </div>
    </div>
  );
}
