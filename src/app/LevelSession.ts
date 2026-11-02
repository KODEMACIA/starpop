import type { Board, LevelConfig, Phase, Rules } from '../core/types';
import { createBoard } from '../core/board';
import { initProgress, applyRemoved, isAllDone } from '../core/goalEvaluator';
import type { GoalProgress } from '../core/goalEvaluator';

export class LevelSession {
  config: LevelConfig;
  rules: Rules;
  board: Board;
  obstacles: number[][];
  movesLeft: number;
  score = 0;
  phase: Phase = 'INPUT_OPEN';
  progress: GoalProgress[];
  iceCleared = 0;

  extraMovesCount = 2;
  brushCount = 1; // 将锤子改为点睛笔
  shuffleCount = 1;
  hintQuotaLeft = 3;
  usedItems = false;

  constructor(config: LevelConfig) {
    this.config = config;
    this.rules = config.board;
    this.board = createBoard(config.board);
    
    this.obstacles = Array.from({ length: config.board.rows }, () => Array(config.board.cols).fill(0));
    if (config.obstacles) {
      if (config.obstacles.rocks) {
        for (const rock of config.obstacles.rocks) {
          this.board[rock.r][rock.c] = 99;
        }
      }
      if (config.obstacles.ices) {
        for (const ice of config.obstacles.ices) {
          this.obstacles[ice.r][ice.c] = ice.layers;
        }
      }
    }

    this.movesLeft = config.movesLimit;
    this.progress = initProgress(config.goals);
  }

  consumeMove(): void { this.movesLeft--; }

  applyRemoved(removed: Record<number, number>, iceCleared: number): void {
    this.progress = applyRemoved(this.progress, removed, iceCleared);
    this.iceCleared += iceCleared;
  }

  goalsDone(): boolean { return isAllDone(this.progress); }
}