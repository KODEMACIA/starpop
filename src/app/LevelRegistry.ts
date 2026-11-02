import type { LevelConfig } from '../core/types';

// 全局纯内存关卡注册表，绕过 Phaser 缓存
export const levelRegistry: Record<number, LevelConfig> = {};