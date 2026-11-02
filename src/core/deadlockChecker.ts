import type { Board, Rules } from './types';
import { findMatches } from './matchDetector';
import { cloneBoard } from './board';

export function hasPossibleMove(board: Board, obstacles: number[][]): boolean {
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 规则1：石头 (99) 和 冰块 (obstacles > 0) 绝对不能交换，直接跳过
      if (board[r][c] === 99 || (obstacles && obstacles[r][c] > 0)) continue;

      // 尝试向右交换
      if (c + 1 < cols) {
        if (board[r][c + 1] !== 99 && (!obstacles || obstacles[r][c + 1] === 0)) {
          const copy = cloneBoard(board);
          [copy[r][c], copy[r][c + 1]] = [copy[r][c + 1], copy[r][c]];
          if (findMatches(copy).length > 0) return true;
        }
      }
      // 尝试向下交换
      if (r + 1 < rows) {
        if (board[r + 1][c] !== 99 && (!obstacles || obstacles[r + 1][c] === 0)) {
          const copy = cloneBoard(board);
          [copy[r][c], copy[r + 1][c]] = [copy[r + 1][c], copy[r][c]];
          if (findMatches(copy).length > 0) return true;
        }
      }
    }
  }
  return false;
}

export function shuffleBoard(board: Board, obstacles: number[][], rules: Rules, rng: () => number = Math.random): Board {
  // 1. 收集所有可以移动的方块（包括底层的彩蛋，但不包括石头）
  const values: number[] = [];
  for (let r = 0; r < rules.rows; r++) {
    for (let c = 0; c < rules.cols; c++) {
      if (board[r][c] !== 99) {
        values.push(board[r][c]);
      }
    }
  }

  // 2. 尝试打乱 50 次
  for (let attempt = 0; attempt < 50; attempt++) {
    // 洗牌算法
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    const next = cloneBoard(board);
    let idx = 0;
    for (let r = 0; r < rules.rows; r++) {
      for (let c = 0; c < rules.cols; c++) {
        if (next[r][c] !== 99) {
          next[r][c] = values[idx++];
        }
      }
    }

    // 3. 检查洗完是否有解且没有自动三连
    if (hasPossibleMove(next, obstacles) && findMatches(next).length === 0) {
      return next;
    }
  }

  // 如果实在洗不开（比如石头把路全堵死了），原样返回
  return board;
}