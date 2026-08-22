export type ChessColor = "w" | "b";
export type ChessPieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type ChessPiece = `${ChessColor}${ChessPieceType}`;
export type ChessBoard = Record<string, ChessPiece>;

export type ChessState = {
  board: ChessBoard;
  turn: ChessColor;
  castling: string;
  enPassant: string;
  halfmove: number;
  fullmove: number;
};

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const EMPTY_FEN = "8/8/8/8/8/8/8/8 w - - 0 1";
export const FILES = "abcdefgh";
export const RANKS = "12345678";

const FEN_TO_PIECE: Record<string, ChessPiece> = {
  P: "wp", N: "wn", B: "wb", R: "wr", Q: "wq", K: "wk",
  p: "bp", n: "bn", b: "bb", r: "br", q: "bq", k: "bk",
};

const PIECE_TO_FEN: Record<ChessPiece, string> = Object.fromEntries(
  Object.entries(FEN_TO_PIECE).map(([fen, piece]) => [piece, fen]),
) as Record<ChessPiece, string>;

export const PIECE_GLYPHS: Record<ChessPiece, string> = {
  wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
  bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
};

export function isSquare(value: string) {
  return /^[a-h][1-8]$/.test(value);
}

export function isUciMove(value: string) {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value);
}

export function parseFen(fen: string): ChessState {
  const parts = String(fen || "").trim().split(/\s+/);
  if (parts.length < 2) throw new Error("Invalid FEN.");
  const [placement, turnRaw, castlingRaw = "-", enPassantRaw = "-", halfmoveRaw = "0", fullmoveRaw = "1"] = parts;
  const ranks = placement.split("/");
  if (ranks.length !== 8) throw new Error("Invalid FEN board.");

  const board: ChessBoard = {};
  ranks.forEach((rankText, rankIndex) => {
    let fileIndex = 0;
    for (const char of rankText) {
      if (/^[1-8]$/.test(char)) {
        fileIndex += Number(char);
        continue;
      }
      const piece = FEN_TO_PIECE[char];
      if (!piece || fileIndex > 7) throw new Error("Invalid FEN board.");
      const rank = String(8 - rankIndex);
      const file = FILES[fileIndex];
      board[`${file}${rank}`] = piece;
      fileIndex += 1;
    }
    if (fileIndex !== 8) throw new Error("Invalid FEN board.");
  });

  const turn: ChessColor = turnRaw === "b" ? "b" : turnRaw === "w" ? "w" : (() => { throw new Error("Invalid side to move."); })();
  const castling = castlingRaw === "-" ? "-" : castlingRaw.replace(/[^KQkq]/g, "");
  const enPassant = enPassantRaw === "-" || isSquare(enPassantRaw) ? enPassantRaw : "-";
  const halfmove = Number.isFinite(Number(halfmoveRaw)) ? Math.max(0, Number(halfmoveRaw)) : 0;
  const fullmove = Number.isFinite(Number(fullmoveRaw)) ? Math.max(1, Number(fullmoveRaw)) : 1;

  return { board, turn, castling: castling || "-", enPassant, halfmove, fullmove };
}

export function stateToFen(state: ChessState) {
  const ranks: string[] = [];
  for (let rank = 8; rank >= 1; rank -= 1) {
    let empty = 0;
    let row = "";
    for (const file of FILES) {
      const piece = state.board[`${file}${rank}`];
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        row += String(empty);
        empty = 0;
      }
      row += PIECE_TO_FEN[piece];
    }
    if (empty) row += String(empty);
    ranks.push(row);
  }
  return `${ranks.join("/")} ${state.turn} ${state.castling || "-"} ${state.enPassant || "-"} ${state.halfmove} ${state.fullmove}`;
}

export function setTurnInFen(fen: string, turn: ChessColor) {
  const state = parseFen(fen);
  state.turn = turn;
  return stateToFen(state);
}

function fileIndex(square: string) {
  return FILES.indexOf(square[0]);
}

function rankNumber(square: string) {
  return Number(square[1]);
}

function removeCastling(castling: string, chars: string) {
  const next = (castling === "-" ? "" : castling).split("").filter((char) => !chars.includes(char)).join("");
  return next || "-";
}

export function applyUciMove(input: ChessState | string, uci: string): ChessState {
  if (!isUciMove(uci)) throw new Error("Invalid move format.");
  const state = typeof input === "string" ? parseFen(input) : input;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci[4] as ChessPieceType | undefined;
  const piece = state.board[from];
  if (!piece) throw new Error(`No piece on ${from}.`);

  const board: ChessBoard = { ...state.board };
  const movingColor = piece[0] as ChessColor;
  const movingType = piece[1] as ChessPieceType;
  const captured = board[to];
  delete board[from];

  if (movingType === "p" && to === state.enPassant && !captured && fileIndex(from) !== fileIndex(to)) {
    const capturedRank = rankNumber(to) + (movingColor === "w" ? -1 : 1);
    delete board[`${to[0]}${capturedRank}`];
  }

  if (movingType === "k" && Math.abs(fileIndex(to) - fileIndex(from)) === 2) {
    const rank = from[1];
    if (to[0] === "g") {
      const rook = board[`h${rank}`];
      if (rook) {
        delete board[`h${rank}`];
        board[`f${rank}`] = rook;
      }
    } else if (to[0] === "c") {
      const rook = board[`a${rank}`];
      if (rook) {
        delete board[`a${rank}`];
        board[`d${rank}`] = rook;
      }
    }
  }

  let placedPiece = piece;
  if (movingType === "p" && (to[1] === "8" || to[1] === "1")) {
    const promoted = promotion && ["q", "r", "b", "n"].includes(promotion) ? promotion : "q";
    placedPiece = `${movingColor}${promoted}` as ChessPiece;
  }
  board[to] = placedPiece;

  let castling = state.castling;
  if (movingType === "k") castling = removeCastling(castling, movingColor === "w" ? "KQ" : "kq");
  if (from === "a1" || to === "a1") castling = removeCastling(castling, "Q");
  if (from === "h1" || to === "h1") castling = removeCastling(castling, "K");
  if (from === "a8" || to === "a8") castling = removeCastling(castling, "q");
  if (from === "h8" || to === "h8") castling = removeCastling(castling, "k");

  let enPassant = "-";
  if (movingType === "p" && Math.abs(rankNumber(to) - rankNumber(from)) === 2) {
    const middleRank = (rankNumber(to) + rankNumber(from)) / 2;
    enPassant = `${from[0]}${middleRank}`;
  }

  const isCapture = Boolean(captured) || (movingType === "p" && to === state.enPassant && fileIndex(from) !== fileIndex(to));
  const halfmove = movingType === "p" || isCapture ? 0 : state.halfmove + 1;
  const fullmove = state.fullmove + (state.turn === "b" ? 1 : 0);

  return {
    board,
    turn: state.turn === "w" ? "b" : "w",
    castling,
    enPassant,
    halfmove,
    fullmove,
  };
}

export function applyUciMoves(fen: string, moves: string[], count = moves.length) {
  let state = parseFen(fen);
  for (const move of moves.slice(0, count)) state = applyUciMove(state, move);
  return state;
}

export function normalizeSolutionMoves(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim().toLowerCase()).filter(isUciMove);
}
