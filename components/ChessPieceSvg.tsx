"use client";

import { ChessPiece } from "@/lib/chess-homework";

function pieceName(piece: ChessPiece) {
  const color = piece[0] === "w" ? "White" : "Black";
  const names: Record<string, string> = {
    k: "king",
    q: "queen",
    r: "rook",
    b: "bishop",
    n: "knight",
    p: "pawn",
  };
  return `${color} ${names[piece[1]] || "piece"}`;
}

export default function ChessPieceSvg({
  piece,
  size = "84%",
}: {
  piece: ChessPiece;
  size?: number | string;
}) {
  const white = piece[0] === "w";
  const type = piece[1];
  const fill = white ? "#f8f6ed" : "#202522";
  const stroke = white ? "#1c2620" : "#f0dfb6";
  const detail = white ? "#1c2620" : "#f4ead0";

  const common = {
    fill,
    stroke,
    strokeWidth: 3.2,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={pieceName(piece)}
      focusable="false"
      style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 1px 1px rgba(0,0,0,.18))" }}
    >
      {type === "p" ? (
        <>
          <circle cx="50" cy="29" r="13" {...common} />
          <path d="M40 42h20c-1 10 2 17 9 24H31c7-7 10-14 9-24Z" {...common} />
          <path d="M28 66h44l5 10H23l5-10Zm-9 10h62l4 10H15l4-10Z" {...common} />
        </>
      ) : null}

      {type === "r" ? (
        <>
          <path d="M24 18h13v10h9V18h9v10h9V18h13v22H24V18Z" {...common} />
          <path d="M30 40h40l-5 29H35L30 40Z" {...common} />
          <path d="M30 69h40l6 9H24l6-9Zm-10 9h60l5 9H15l5-9Z" {...common} />
          <path d="M35 47h30" fill="none" stroke={detail} strokeWidth="2.4" opacity=".8" />
        </>
      ) : null}

      {type === "n" ? (
        <>
          <path d="M29 70c4-18 13-28 27-35l-7-15c12 3 21 9 26 19 5 11 1 22-8 31H29Z" {...common} />
          <path d="M49 20 33 31l15 3" {...common} />
          <circle cx="62" cy="39" r="2.8" fill={detail} stroke="none" />
          <path d="M53 49c6 2 11 1 15-2" fill="none" stroke={detail} strokeWidth="2.5" />
          <path d="M26 70h48l6 9H20l6-9Zm-9 9h66l4 8H13l4-8Z" {...common} />
        </>
      ) : null}

      {type === "b" ? (
        <>
          <path d="M50 16c11 10 18 19 18 29 0 10-7 18-18 21-11-3-18-11-18-21 0-10 7-19 18-29Z" {...common} />
          <path d="M42 31 58 47" fill="none" stroke={detail} strokeWidth="4" />
          <circle cx="50" cy="15" r="4.5" {...common} />
          <path d="M31 66h38l7 11H24l7-11Zm-12 11h62l5 10H14l5-10Z" {...common} />
        </>
      ) : null}

      {type === "q" ? (
        <>
          <circle cx="22" cy="25" r="5" {...common} />
          <circle cx="40" cy="18" r="5" {...common} />
          <circle cx="60" cy="18" r="5" {...common} />
          <circle cx="78" cy="25" r="5" {...common} />
          <path d="M22 30 31 59h38l9-29-17 15-11-22-11 22-17-15Z" {...common} />
          <path d="M31 59h38l6 11H25l6-11Zm-9 11h56l5 9H17l5-9Zm-5 9h66l4 9H13l4-9Z" {...common} />
          <path d="M34 53h32" fill="none" stroke={detail} strokeWidth="2.5" />
        </>
      ) : null}

      {type === "k" ? (
        <>
          <path d="M50 10v20M41 19h18" fill="none" stroke={detail} strokeWidth="5" />
          <path d="M38 31h24l8 12-8 17H38l-8-17 8-12Z" {...common} />
          <path d="M38 60h24l8 10H30l8-10Zm-13 10h50l6 9H19l6-9Zm-8 9h66l4 9H13l4-9Z" {...common} />
          <path d="M39 45h22" fill="none" stroke={detail} strokeWidth="2.5" />
        </>
      ) : null}
    </svg>
  );
}
