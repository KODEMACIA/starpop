export type Board = number[][];

export interface Rules {
  rows: number;
  cols: number;
  elementTypes: number;
}

export interface Cell { r: number; c: number; }
export interface Move { r1: number; c1: number; r2: number; c2: number; }
export interface MatchGroup { cells: Cell[]; }

export interface WaveEvent {
  type: 'wave';
  cells: Cell[];
  boardAfter: Board;
  obstaclesAfter: number[][];
  scoreDelta: number;
  wave: number;
  matchCount: number;
}
export type GameEvent = WaveEvent;

export interface ApplyMoveResult {
  board: Board;
  obstacles: number[][];
  scoreDelta: number;
  waves: number;
  events: GameEvent[];
  removed: Record<number, number>;
  iceCleared: number;
}

export type Goal = 
  | { type: 'collect'; element: number; count: number }
  | { type: 'clearIce'; count: number };

export interface LevelConfig {
  id: number;
  name: string;
  board: Rules;
  movesLimit: number;
  goals: Goal[];
  starThresholds: { scores: [number, number, number] };
  obstacles?: {
    rocks?: Cell[];
    ices?: { r: number, c: number, layers: number }[];
  };
}

export type Phase = 'INPUT_OPEN' | 'CHALLENGE' | 'WON' | 'LOST';