import type { Board, Cell, Rules } from './types';
import { randomElement } from './board';

export function collapse(board: Board): { board: Board; moves: number } {
  const rows = board.length;
  const cols = board[0].length;
  const next = Array.from({ length: rows }, () => Array(cols).fill(0));
  let moves = 0;
  for (let c = 0; c < cols; c++) {
    let write = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (board[r][c] !== 0) {
        next[write][c] = board[r][c];
        if (write !== r) moves++;
        write--;
      }
    }
  }
  return { board: next, moves };
}

export function spawn(board: Board, rules: Rules, rng: () => number = Math.random): { board: Board; cells: Cell[] } {
  const rows = board.length;
  const cols = board[0].length;
  const next = board.map(row => [...row]);
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c] === 0) {
        next[r][c] = randomElement(rules, rng);
        cells.push({ r, c });
      }
    }
  }
  return { board: next, cells };
}