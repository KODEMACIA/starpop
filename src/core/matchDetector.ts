import type { Board, MatchGroup } from './types';

export function findMatches(board: Board): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const rows = board.length;
  const cols = board[0].length;

  // 石头值为 99，彩蛋 >= 100，普通元素 1~6
  const getBase = (val: number) => (val >= 100 ? val % 100 : val);

  for (let r = 0; r < rows; r++) {
    let start = 0;
    for (let c = 1; c <= cols; c++) {
      const same = c < cols && board[r][c] !== 0 && board[r][c] !== 99 && 
                   board[r][start] !== 99 && getBase(board[r][c]) === getBase(board[r][start]);
      if (!same) {
        if (c - start >= 3 && board[r][start] !== 99) {
          groups.push({
            cells: Array.from({ length: c - start }, (_, i) => ({ r, c: start + i })),
          });
        }
        start = c;
      }
    }
  }

  for (let c = 0; c < cols; c++) {
    let start = 0;
    for (let r = 1; r <= rows; r++) {
      const same = r < rows && board[r][c] !== 0 && board[r][c] !== 99 && 
                   board[start][c] !== 99 && getBase(board[r][c]) === getBase(board[start][c]);
      if (!same) {
        if (r - start >= 3 && board[start][c] !== 99) {
          groups.push({
            cells: Array.from({ length: r - start }, (_, i) => ({ r: start + i, c })),
          });
        }
        start = r;
      }
    }
  }

  return groups;
}