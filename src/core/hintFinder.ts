import type { Board, Move } from './types';
import { swapCells } from './board';
import { findMatches } from './matchDetector';

export function findHint(board: Board, obstacles: number[][]): Move | null {
  const rows = board.length;
  const cols = board[0].length;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 尝试向右交换
      if (c + 1 < cols) {
        // 拦截：只要有冰块或石头，就不是合法提示
        if (obstacles[r][c] === 0 && obstacles[r][c + 1] === 0 && board[r][c] !== 99 && board[r][c + 1] !== 99) {
          const move = { r1: r, c1: c, r2: r, c2: c + 1 };
          if (findMatches(swapCells(board, move)).length > 0) return move;
        }
      }
      // 尝试向下交换
      if (r + 1 < rows) {
        if (obstacles[r][c] === 0 && obstacles[r + 1][c] === 0 && board[r][c] !== 99 && board[r + 1][c] !== 99) {
          const move = { r1: r, c1: c, r2: r + 1, c2: c };
          if (findMatches(swapCells(board, move)).length > 0) return move;
        }
      }
    }
  }
  return null;
}