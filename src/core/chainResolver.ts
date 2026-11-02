import type { Board, Cell, GameEvent, Rules, MatchGroup } from './types';
import { findMatches } from './matchDetector';
import { collapse, spawn } from './gravityResolver';
import { calculateWaveScore } from './scoreCalculator';
import { cloneBoard, createBoard } from './board';

export interface ChainResult {
  board: Board;
  obstacles: number[][];
  scoreDelta: number;
  waves: number;
  events: GameEvent[];
  removed: Record<number, number>;
  iceCleared: number;
}

function mergeGroups(groups: MatchGroup[]): { cells: Cell[], intersection: Cell | null } {
  const cellCount = new Map<string, number>();
  const allCells = new Map<string, Cell>();

  for (const g of groups) {
    for (const c of g.cells) {
      const key = `${c.r},${c.c}`;
      cellCount.set(key, (cellCount.get(key) || 0) + 1);
      allCells.set(key, c);
    }
  }

  let intersection: Cell | null = null;
  cellCount.forEach((count, key) => {
    if (count >= 2) {
      const [r, c] = key.split(',').map(Number);
      intersection = { r, c };
    }
  });

  return { cells: Array.from(allCells.values()), intersection };
}

export function resolveChain(
  board: Board,
  initialObstacles: number[][],
  rules: Rules,
  rng: () => number = Math.random
): ChainResult {
  let current = cloneBoard(board);
  let obstacles = initialObstacles.map(row => [...row]);
  let totalScore = 0;
  let wave = 1;
  let iceCleared = 0;
  const events: GameEvent[] = [];
  const removed: Record<number, number> = {};
  
  let hasClearedScreen = false; 

  while (true) {
    const rawGroups = findMatches(current);
    if (rawGroups.length === 0) break;

    const waveScore = calculateWaveScore(rawGroups, wave);
    totalScore += waveScore;

    const uniqueCells = new Map<string, Cell>();
    const newEggs = new Map<string, number>();

    const merged = mergeGroups(rawGroups);

    if (merged.cells.length >= 4) {
      let eggPos: Cell | null = null;
      if (merged.intersection && current[merged.intersection.r][merged.intersection.c] < 100) {
        eggPos = merged.intersection;
      }
      if (!eggPos) {
        for (const c of merged.cells) {
          if (current[c.r][c.c] < 100 && current[c.r][c.c] !== 99) {
            eggPos = c;
            break;
          }
        }
      }
      if (!eggPos) eggPos = merged.cells[Math.floor(merged.cells.length / 2)];

      const baseVal = current[eggPos.r][eggPos.c] % 100;
      let eggType = 100;
      if (merged.cells.length === 5) eggType = 200;
      else if (merged.cells.length === 6) eggType = 300;
      else if (merged.cells.length >= 7) eggType = 400;
      newEggs.set(`${eggPos.r},${eggPos.c}`, eggType + baseVal);
    }

    for (const c of merged.cells) {
      uniqueCells.set(`${c.r},${c.c}`, c);
    }

    newEggs.forEach((_, key) => uniqueCells.delete(key));

    const queue: Cell[] = [];
    uniqueCells.forEach(cell => {
      if (current[cell.r][cell.c] >= 100) queue.push(cell);
    });

    const processedEggs = new Set<string>();
    let clearScreenTriggered = false;

    while (queue.length > 0) {
      const egg = queue.shift()!;
      const key = `${egg.r},${egg.c}`;
      if (processedEggs.has(key) || newEggs.has(key)) continue;
      processedEggs.add(key);

      const val = current[egg.r][egg.c];
      const type = Math.floor(val / 100);

      if (type >= 4) {
        clearScreenTriggered = true;
      } else if (type === 1) {
        const isHorizontal = rng() < 0.5;
        if (isHorizontal) {
          for (let c = 0; c < rules.cols; c++) {
            if (current[egg.r][c] >= 100 && !processedEggs.has(`${egg.r},${c}`) && !newEggs.has(`${egg.r},${c}`)) queue.push({ r: egg.r, c });
            if (!newEggs.has(`${egg.r},${c}`) && current[egg.r][c] !== 99) uniqueCells.set(`${egg.r},${c}`, { r: egg.r, c });
          }
        } else {
          for (let r = 0; r < rules.rows; r++) {
            if (current[r][egg.c] >= 100 && !processedEggs.has(`${r},${egg.c}`) && !newEggs.has(`${r},${egg.c}`)) queue.push({ r, c: egg.c });
            if (!newEggs.has(`${r},${egg.c}`) && current[r][egg.c] !== 99) uniqueCells.set(`${r},${egg.c}`, { r, c: egg.c });
          }
        }
      } else {
        const radius = type;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = egg.r + dr;
            const nc = egg.c + dc;
            if (nr >= 0 && nr < rules.rows && nc >= 0 && nc < rules.cols) {
              if (current[nr][nc] >= 100 && !processedEggs.has(`${nr},${nc}`) && !newEggs.has(`${nr},${nc}`)) queue.push({ r: nr, c: nc });
              if (!newEggs.has(`${nr},${nc}`) && current[nr][nc] !== 99) uniqueCells.set(`${nr},${nc}`, { r: nr, c: nc });
            }
          }
        }
      }
    }

    const isClearScreen = (wave >= 5 || clearScreenTriggered) && !hasClearedScreen;
    
    if (isClearScreen) {
      hasClearedScreen = true;
      for (let r = 0; r < rules.rows; r++) {
        for (let c = 0; c < rules.cols; c++) {
          if (!newEggs.has(`${r},${c}`) && current[r][c] !== 99) {
            uniqueCells.set(`${r},${c}`, { r, c });
          }
        }
      }
    }

    const cells = Array.from(uniqueCells.values());

    for (const cell of cells) {
      const v = current[cell.r][cell.c] % 100;
      removed[v] = (removed[v] ?? 0) + 1;
    }

    for (const cell of cells) {
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) {
        const nr = cell.r + dr;
        const nc = cell.c + dc;
        if (nr >= 0 && nr < rules.rows && nc >= 0 && nc < rules.cols) {
          if (obstacles[nr][nc] > 0) {
            obstacles[nr][nc]--;
            iceCleared++;
          }
        }
      }
    }

    const cleared = cloneBoard(current);
    for (const cell of cells) cleared[cell.r][cell.c] = 0;

    if (isClearScreen) {
      // 清屏时，重新生成干净棋盘
      current = createBoard(rules, rng);
      
      // 把原有的石头放回去（保护石头不消失）
      for (let r = 0; r < rules.rows; r++) {
        for (let c = 0; c < rules.cols; c++) {
          if (board[r][c] === 99) {
            current[r][c] = 99;
          }
        }
      }

      // 强制丢弃新生成的彩蛋
      newEggs.clear(); 

      for (let r = 0; r < rules.rows; r++) {
        for (let c = 0; c < rules.cols; c++) {
          if (obstacles[r][c] > 0) {
            obstacles[r][c]--;
            iceCleared++;
          }
        }
      }
    } else {
      const collapsed = collapse(cleared);
      const spawned = spawn(collapsed.board, rules, rng);
      current = spawned.board;
    }

    newEggs.forEach((val, key) => {
      const [r, c] = key.split(',').map(Number);
      current[r][c] = val;
    });

    events.push({ 
      type: 'wave', 
      cells, 
      boardAfter: cloneBoard(current), 
      obstaclesAfter: obstacles.map(row => [...row]),
      scoreDelta: waveScore, 
      wave,
      matchCount: rawGroups.length
    });
    
    wave++;
  }

  // 【最后防线】绝对保证返回的棋盘没有任何天然三连
  // 如果因为放置新生成的彩蛋或者石头导致有三连，直接强制打乱
  if (findMatches(current).length > 0) {
    current = createBoard(rules, rng);
    for (let r = 0; r < rules.rows; r++) {
      for (let c = 0; c < rules.cols; c++) {
        if (board[r][c] === 99) current[r][c] = 99;
      }
    }
  }

  return { board: current, obstacles, scoreDelta: totalScore, waves: wave - 1, events, removed, iceCleared };
}