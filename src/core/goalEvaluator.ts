import type { Goal } from './types';

export interface GoalProgress { goal: Goal; current: number; }

export function initProgress(goals: Goal[]): GoalProgress[] {
  return goals.map(g => ({ goal: g, current: 0 }));
}

export function applyRemoved(progress: GoalProgress[], removed: Record<number, number>, iceCleared: number): GoalProgress[] {
  return progress.map(p => {
    if (p.goal.type === 'collect') {
      const add = removed[p.goal.element] ?? 0;
      return { ...p, current: Math.min(p.current + add, p.goal.count) };
    } else if (p.goal.type === 'clearIce') {
      return { ...p, current: Math.min(p.current + iceCleared, p.goal.count) };
    }
    return p;
  });
}

export function isAllDone(progress: GoalProgress[]): boolean {
  return progress.every(p => p.current >= p.goal.count);
}