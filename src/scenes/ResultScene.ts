import Phaser from 'phaser';
import { audio } from '../infra/AudioService';
import { leaderboard } from '../app/LeaderboardGateway';
import { progress } from '../app/ProgressService';

export class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }

  create(data: {
    levelId: number; score: number; stars: number; won: boolean;
    starThresholds: [number, number, number];
    usedItems?: boolean;
  }): void {
    const { levelId, score, stars, won, usedItems } = data;
    
    // 1. 音乐与音效
    if (progress.settings.music) {
      audio.playBgm('result');
    } else {
      audio.stopBgm();
    }
    if (won) audio.playWin();
    
    // 2. 提交分数到云端（使用真实昵称）
    const mode = progress.settings.careMode ? 'care' : 'normal';
    const nickname = progress.nickname; // 读取玩家自定义昵称

    // 提交单关分榜
    leaderboard.submitScore(mode, levelId, score, nickname);

    // 提交总分总榜（真实总分）
    const totalScore = progress.getTotalScore();
    leaderboard.submitScore(mode, undefined, totalScore, nickname);

    // 3. 渲染 UI
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    this.add.rectangle(cx, cy, 600, 800, 0x0f0f1a, 1);
    this.add.rectangle(cx, cy, 480, 620, 0x1a1a2e).setStrokeStyle(2, 0x333344);

    if (won) this.createConfetti(cx, cy);

    this.add.text(cx, cy - 240, won ? '关卡完成！' : '步数用尽', {
      fontSize: '36px', color: won ? '#ffe66d' : '#ff6b6b', fontStyle: 'bold', padding: { y: 8 }
    }).setOrigin(0.5);

    const subTitle = won ? (stars === 3 ? '完美通关！星屑为你闪耀' : '干得漂亮，继续加油！') : '差一点点，再试一次吧';
    this.add.text(cx, cy - 190, subTitle, {
      fontSize: '18px', color: '#aaaaaa', padding: { y: 4 }
    }).setOrigin(0.5);

    const starText = this.add.text(cx, cy - 120, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
      fontSize: '64px', color: '#ffe66d', padding: { y: 8 }
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: starText, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: 2, duration: 300, delay: 200
    });

    this.add.text(cx, cy - 30, `本局得分: ${score}`, {
      fontSize: '24px', color: '#ffffff', padding: { y: 6 }
    }).setOrigin(0.5);

    this.add.text(cx, cy + 10, `历史总分: ${totalScore}`, {
      fontSize: '18px', color: '#4ecdc4', padding: { y: 4 }
    }).setOrigin(0.5);

    if (usedItems) {
      this.add.text(cx, cy + 40, '注：本局使用了道具，最高分受封顶限制', {
        fontSize: '14px', color: '#888899', padding: { y: 4 }
      }).setOrigin(0.5);
    }

    const createButton = (y: number, label: string, color: number, cb: () => void) => {
      const rect = this.add.rectangle(cx, y, 240, 56, color).setInteractive({ useHandCursor: true });
      this.add.text(cx, y, label, { fontSize: '22px', color: '#1a1a2e', padding: { y: 4 } }).setOrigin(0.5);
      
      rect.on('pointerover', () => {
        const c = Phaser.Display.Color.ValueToColor(color);
        rect.setFillStyle(c.brighten(20).color);
      });
      rect.on('pointerout', () => rect.setFillStyle(color));
      rect.on('pointerdown', cb);
    };

    const startY = usedItems ? cy + 100 : cy + 80;
    createButton(startY, '重试', 0x4ecdc4, () => this.scene.start('GameScene', { levelId }));
    
    if (won && levelId < 18) {
      createButton(startY + 80, '下一关', 0xffe66d, () => this.scene.start('GameScene', { levelId: levelId + 1 }));
      createButton(startY + 160, '返回关卡选择', 0xaaaaaa, () => this.scene.start('LevelSelectScene'));
    } else {
      createButton(startY + 80, '返回关卡选择', 0xaaaaaa, () => this.scene.start('LevelSelectScene'));
    }
  }

  private createConfetti(cx: number, cy: number): void {
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x6c5ce7, 0x00b894, 0xfd79a8];
    this.time.delayedCall(100, () => {
      for (let i = 0; i < 80; i++) {
        const x = cx + Phaser.Math.Between(-250, 250);
        const y = cy - 300;
        const size = Phaser.Math.Between(6, 12);
        const rect = this.add.rectangle(x, y, size, size * 0.6, Phaser.Utils.Array.GetRandom(colors));
        this.tweens.add({
          targets: rect, y: cy + 300, x: x + Phaser.Math.Between(-100, 100),
          angle: Phaser.Math.Between(0, 720), duration: Phaser.Math.Between(2000, 3500),
          ease: 'Cubic.easeIn', onComplete: () => rect.destroy()
        });
      }
    });
  }
}