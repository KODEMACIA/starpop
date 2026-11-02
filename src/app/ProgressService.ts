import { repo } from '../infra/ProgressRepository';
import type { SaveData } from '../infra/ProgressRepository';

class ProgressServiceImpl {
  data: SaveData = { unlocked: 1, levels: {}, settings: { careMode: false, music: true, sfx: true }, nickname: '' };
  isReady = false;

  async load(): Promise<void> {
    await repo.init();
    this.data = await repo.load();
    
    // 如果没有昵称，生成一个随机的
    if (!this.data.nickname) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      this.data.nickname = `星屑玩家${randomNum}`;
      this.save();
    }
    
    this.isReady = true;
  }

  private save() {
    repo.save(this.data);
  }

  getStars(levelId: number): number { return this.data.levels[levelId]?.stars ?? 0; }
  getBest(levelId: number): number { return this.data.levels[levelId]?.bestScore ?? 0; }
  get unlocked() { return this.data.unlocked; }
  get settings() { return this.data.settings; }
  get nickname() { return this.data.nickname; }

  getTotalScore(): number {
    return Object.values(this.data.levels).reduce((sum, lvl) => sum + (lvl.bestScore || 0), 0);
  }

  commit(levelId: number, stars: number, score: number, totalLevels: number): void {
    const prev = this.data.levels[levelId] ?? { stars: 0, bestScore: 0 };
    this.data.levels[levelId] = {
      stars: Math.max(prev.stars, stars),
      bestScore: Math.max(prev.bestScore, score),
    };
    if (stars >= 1 && levelId < totalLevels) {
      this.data.unlocked = Math.max(this.data.unlocked, levelId + 1);
    }
    this.save();
  }

  setSetting<K extends keyof SaveData['settings']>(key: K, value: SaveData['settings'][K]): void {
    this.data.settings[key] = value;
    this.save();
  }

  setNickname(name: string): void {
    if (name.trim()) {
      this.data.nickname = name.trim().substring(0, 12); // 限制最多 12 个字符
      this.save();
    }
  }
}

export const progress = new ProgressServiceImpl();