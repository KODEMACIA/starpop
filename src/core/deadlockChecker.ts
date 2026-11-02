import type { Board, Rules } from './types';
import { createBoard } from './board';
import { findMatches } from './matchDetector';

export function hasPossibleMove(board: Board): boolean {
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) {
        const copy = board.map((row) => [...row]);
        [copy[r][c], copy[r][c + 1]] = [copy[r][c + 1], copy[r][c]];
        if (findMatches(copy).length > 0) return true;
      }
      if (r + 1 < rows) {
        const copy = board.map((row) => [...row]);
        [copy[r][c], copy[r + 1][c]] = [copy[r + 1][c], copy[r][c]];
        if (findMatches(copy).length > 0) return true;
      }
    }
  }

  return false;
}

export function shuffleBoard(
  board: Board,
  rules: Rules,
  rng: () => number = Math.random
): Board {
  for (let i = 0; i < 50; i++) {
    const next = createBoard(rules, rng);
    if (hasPossibleMove(next) && findMatches(next).length === 0) return next;
  }
  return board;
}