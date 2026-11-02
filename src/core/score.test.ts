import { describe, expect, it } from 'vitest';
import { calculateWaveScore, scoreGroup } from './scoreCalculator';
import type { MatchGroup } from './types';

function group(size: number): MatchGroup {
  return { cells: Array.from({ length: size }, (_, i) => ({ r: 0, c: i })) };
}

describe('score formula', () => {
  it('3 连 = 30', () => {
    expect(scoreGroup(3, 1, 1)).toBe(30);
  });

  it('4 连 = 70', () => {
    expect(scoreGroup(4, 1, 1)).toBe(70);
  });

  it('5 连 = 150', () => {
    expect(scoreGroup(5, 1, 1)).toBe(150);
  });

  it('双消两组 3 连 = 90', () => {
    expect(calculateWaveScore([group(3), group(3)], 1)).toBe(90);
  });

  it('第 2 波双消 = 108', () => {
    expect(calculateWaveScore([group(3), group(3)], 2)).toBe(108);
  });
});