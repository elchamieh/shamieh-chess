export type AcademyPlayer = {
  user_id: string;
  display_name: string;
};

export type LiveChallenge = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  initial_seconds: number;
  increment_seconds: number;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  created_at: string;
  expires_at: string;
  responded_at?: string | null;
};

export type LiveGameMove = {
  uci: string;
  san?: string;
  at?: string;
};

export type LiveGame = {
  id: string;
  challenge_id: string;
  white_id: string;
  black_id: string;
  white_name: string;
  black_name: string;
  status: "active" | "completed";
  fen: string;
  moves: LiveGameMove[];
  pgn: string;
  initial_seconds: number;
  increment_seconds: number;
  white_time_ms: number;
  black_time_ms: number;
  turn_started_at: string;
  result: "1-0" | "0-1" | "1/2-1/2" | null;
  result_reason: string | null;
  winner_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export const LIVE_TIME_CONTROLS = [
  { initialSeconds: 180, incrementSeconds: 2, label: "3 + 2" },
  { initialSeconds: 300, incrementSeconds: 0, label: "5 + 0" },
  { initialSeconds: 300, incrementSeconds: 3, label: "5 + 3" },
  { initialSeconds: 600, incrementSeconds: 0, label: "10 + 0" },
  { initialSeconds: 600, incrementSeconds: 5, label: "10 + 5" },
] as const;

export function formatTimeControl(initialSeconds: number, incrementSeconds: number) {
  const minutes = Math.round(Number(initialSeconds) / 60);
  return `${minutes} + ${Number(incrementSeconds)}`;
}

export function formatChessClock(milliseconds: number) {
  const safe = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function gameResultLabel(game: Pick<LiveGame, "result" | "result_reason" | "white_name" | "black_name">) {
  if (!game.result) return "In progress";
  const reason = game.result_reason ? ` · ${game.result_reason}` : "";
  if (game.result === "1/2-1/2") return `Draw${reason}`;
  const winner = game.result === "1-0" ? game.white_name : game.black_name;
  return `${winner} won${reason}`;
}
