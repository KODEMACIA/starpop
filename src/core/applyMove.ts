import type { ApplyMoveResult, Board, Move, Rules } from './types';
import { isAdjacent, swapCells } from './board';
import { resolveChain } from './chainResolver';
import { findMatches } from './matchDetector';

export function applyMove(
  board: Board,
  obstacles: number[][],
  move: Move,
  rules: Rules,
  rng: () => number = Math.random
): ApplyMoveResult | null {
  if (!isAdjacent(move)) return null;
  
  // 石头不可交换 (99)
  if (board[move.r1][move.c1] === 99 || board[move.r2][move.c2] === 99) return null;
  
  // 冰块未解冻前，里面的元素不可交换
  if (obstacles[move.r1][move.c1] > 0 || obstacles[move.r2][move.c2] > 0) return null;

  const swapped = swapCells(board, move);
  if (findMatches(swapped).length === 0) return null;

  const result = resolveChain(swapped, obstacles, rules, rng);
  return {
    board: result.board,
    obstacles: result.obstacles,
    scoreDelta: result.scoreDelta,
    waves: result.waves,
    events: result.events,
    removed: result.removed,
    iceCleared: result.iceCleared,
  };
}