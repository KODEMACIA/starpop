import type { Board, Move, Rules } from './types';
import { findMatches } from './matchDetector';

export function randomElement(rules: Rules, rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * rules.elementTypes);
}

export function createBoard(rules: Rules, rng: () => number = Math.random): Board {
  for (let attempt = 0; attempt < 100; attempt++) {
    const board = Array.from({ length: rules.rows }, () =>
      Array.from({ length: rules.cols }, () => randomElement(rules, rng))
    );
    if (findMatches(board).length === 0) return board;
  }
  return Array.from({ length: rules.rows }, () =>
    Array.from({ length: rules.cols }, () => randomElement(rules, rng))
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function isAdjacent(move: Move): boolean {
  return Math.abs(move.r1 - move.r2) + Math.abs(move.c1 - move.c2) === 1;
}

export function swapCells(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const tmp = next[move.r1][move.c1];
  next[move.r1][move.c1] = next[move.r2][move.c2];
  next[move.r2][move.c2] = tmp;
  return next;
}