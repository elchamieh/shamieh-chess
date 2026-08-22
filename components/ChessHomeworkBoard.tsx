"use client";

import ChessPieceSvg from "./ChessPieceSvg";
import { ChessPiece, FILES, RANKS } from "@/lib/chess-homework";

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
        boxShadow: "0 8px 24px rgba(24,60,45,.12)",
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
              background: selected ? "#e6bd57" : dark ? "#78945d" : "#f1ead8",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {piece ? <ChessPieceSvg piece={piece} /> : null}
            {file === files[0] ? (
              <span style={{ position: "absolute", top: 3, left: 4, fontSize: 10, fontWeight: 700, color: dark ? "#f4f1e8" : "#36563e" }}>{rank}</span>
            ) : null}
            {rank === ranks[ranks.length - 1] ? (
              <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: 10, fontWeight: 700, color: dark ? "#f4f1e8" : "#36563e" }}>{file}</span>
            ) : null}
          </button>
        );
      }))}
    </div>
  );
}
