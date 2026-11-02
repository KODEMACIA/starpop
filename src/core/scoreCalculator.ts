import type { MatchGroup } from './types';

export function scoreGroup(cellCount: number, k: number, wave: number): number {
  let sizeBonus = 0;
  if (cellCount === 4) sizeBonus = 30;
  else if (cellCount >= 5) sizeBonus = 100;

  const waveMultiplier = Math.min(1 + 0.2 * (wave - 1), 3.0);
  const comboMultiplier = 1 + 0.5 * (k - 1);

  return (cellCount * 10 + sizeBonus) * comboMultiplier * waveMultiplier;
}

export function calculateWaveScore(groups: MatchGroup[], wave: number): number {
  const k = groups.length;
  return groups.reduce((sum, group) => sum + scoreGroup(group.cells.length, k, wave), 0);
}