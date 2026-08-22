"use client";

import { ChessPiece, FILES, PIECE_GLYPHS, RANKS } from "@/lib/chess-homework";

export default function ChessHomeworkBoard({
  board,
  selectedSquare,
  flipped = false,
  onSquareClick,
  disabled = false,
}: {
  board: Record<string, ChessPiece>;
  selectedSquare?: string | null;
  flipped?: boolean;
  onSquareClick?: (square: string) => void;
  disabled?: boolean;
}) {
  const files = (flipped ? [...FILES].reverse() : [...FILES]) as string[];
  const ranks = (flipped ? [...RANKS] : [...RANKS].reverse()) as string[];

  return (
    <div
      aria-label="Chess board"
      style={{
        width: "min(100%, 520px)",
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        border: "2px solid #183c2d",
        borderRadius: 8,
        overflow: "hidden",
        background: "#f0d9b5",
      }}
    >
      {ranks.flatMap((rank) => files.map((file) => {
        const square = `${file}${rank}`;
        const piece = board[square];
        const dark = (FILES.indexOf(file) + Number(rank)) % 2 === 0;
        const selected = selectedSquare === square;
        return (
          <button
            type="button"
            key={square}
            aria-label={`${square}${piece ? ` ${piece}` : " empty"}`}
            onClick={() => onSquareClick?.(square)}
            disabled={disabled}
            style={{
              position: "relative",
              border: 0,
              borderRadius: 0,
              aspectRatio: "1 / 1",
              cursor: disabled ? "default" : "pointer",
              background: selected ? "#e6bd57" : dark ? "#769656" : "#eeeed2",
              color: piece?.startsWith("w") ? "#fff" : "#111",
              textShadow: piece?.startsWith("w") ? "0 1px 2px #111, 0 0 1px #111" : "0 1px 1px #fff",
              fontSize: "clamp(26px, 7vw, 48px)",
              lineHeight: 1,
              padding: 0,
              fontFamily: "Arial Unicode MS, Segoe UI Symbol, sans-serif",
            }}
          >
            {piece ? PIECE_GLYPHS[piece] : ""}
            {file === files[0] ? (
              <span style={{ position: "absolute", top: 3, left: 4, fontSize: 10, color: dark ? "#eef4e8" : "#36563e", textShadow: "none" }}>{rank}</span>
            ) : null}
            {rank === ranks[ranks.length - 1] ? (
              <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: 10, color: dark ? "#eef4e8" : "#36563e", textShadow: "none" }}>{file}</span>
            ) : null}
          </button>
        );
      }))}
    </div>
  );
}
