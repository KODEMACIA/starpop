import Phaser from 'phaser';
import { progress } from '../app/ProgressService';
import { audio } from '../infra/AudioService';
import type { LevelConfig } from '../core/types';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }

  create(): void {
    const scale = progress.settings.careMode ? 1.2 : 1.0;
    
    this.add.text(300, 30, '星屑消消乐', { 
      fontSize: `${32 * scale}px`, color: '#ffffff', padding: { y: 8 } 
    }).setOrigin(0.5, 0);

    const settingsBtn = this.add.text(560, 20, '⚙ 设置', {
      fontSize: `${16 * scale}px`, color: '#aaaaaa', backgroundColor: '#2a2a40', padding: { x: 10, y: 8 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => this.scene.start('SettingsScene'));

    const rankBtn = this.add.text(560, 60, '🏆 排行榜', {
      fontSize: `${16 * scale}px`, color: '#ffe66d', backgroundColor: '#2a2a40', padding: { x: 10, y: 8 }
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    rankBtn.on('pointerdown', () => this.scene.start('RankScene'));

    this.generateAndLoadLevels();

    for (let chapter = 0; chapter < 3; chapter++) {
      const startY = 100 + chapter * 230;
      this.add.text(40, startY, `第 ${chapter + 1} 章`, {
        fontSize: `${20 * scale}px`, color: '#4ecdc4', fontStyle: 'bold', padding: { y: 6 }
      });

      let chapterStars = 0;
      for (let i = 1; i <= 5; i++) {
        chapterStars += progress.getStars(chapter * 6 + i);
      }

      for (let i = 1; i <= 6; i++) {
        const lvlId = chapter * 6 + i;
        const isBoss = i === 6;
        const x = 20 + ((i - 1) % 6) * 96;
        const y = startY + 40;

        if (!isBoss) {
          this.drawLevelButton(lvlId, x, y, 80, 90, scale);
        } else {
          const canPlay = chapterStars >= 14;
          const rect = this.add.rectangle(x, y, 80, 90, canPlay ? 0xff7675 : 0x333333).setOrigin(0);
          rect.setStrokeStyle(2, 0xffffff, 0.5);
          this.add.text(x + 40, y + 15, `挑战`, {
            fontSize: `${18 * scale}px`, color: canPlay ? '#fff' : '#777', padding: { y: 4 }
          }).setOrigin(0.5, 0);
          
          this.add.text(x + 40, y + 50, canPlay ? '开启' : `需14★`, {
            fontSize: `${12 * scale}px`, color: canPlay ? '#ffe66d' : '#ff7675', padding: { y: 4 }
          }).setOrigin(0.5, 0);

          if (canPlay) {
            rect.setInteractive({ useHandCursor: true });
            rect.on('pointerdown', () => this.scene.start('GameScene', { levelId: lvlId }));
          }
        }
      }
    }

    audio.init();
    if (progress.settings.music) {
      this.input.once('pointerdown', () => audio.playBgm('menu'));
    }
  }

  private drawLevelButton(id: number, x: number, y: number, w: number, h: number, scale: number) {
    const unlocked = id <= progress.unlocked;
    const rect = this.add.rectangle(x, y, w, h, unlocked ? 0x4ecdc4 : 0x333333).setOrigin(0);
    rect.setStrokeStyle(2, 0xffffff, 0.3);

    this.add.text(x + w/2, y + 15, `${id}关`, {
      fontSize: `${16 * scale}px`, color: unlocked ? '#1a1a2e' : '#777777', padding: { y: 4 }
    }).setOrigin(0.5, 0);

    const stars = progress.getStars(id);
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.add.text(x + w/2, y + 55, starStr, { 
      fontSize: `${14 * scale}px`, color: '#ffe66d', padding: { y: 4 } 
    }).setOrigin(0.5, 0);

    if (unlocked) {
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.scene.start('GameScene', { levelId: id }));
    }
  }

  private generateAndLoadLevels() {
    // 每次进入都强制刷新配置
    for (let i = 1; i <= 18; i++) {
      const chapter = Math.floor((i - 1) / 6);
      const isBoss = i % 6 === 0;
      const elementTypes = Math.min(5 + chapter, 6);

      const lvl: LevelConfig = {
        id: i,
        name: isBoss ? `挑战 ${chapter+1}` : `第 ${i} 关`,
        board: { rows: 8, cols: 8, elementTypes },
        movesLimit: 20 + chapter * 2 + (i % 3) * 2,
        goals: [],
        starThresholds: { scores: [500 + chapter*300, 1200 + chapter*300, 2000 + chapter*300] }
      };

      if (isBoss) {
        // === 只有挑战关卡才有障碍物 ===
        lvl.obstacles = {
          rocks: [{r:3,c:3}, {r:3,c:4}, {r:4,c:3}, {r:4,c:4}],
          ices: []
        };
        
        // 使用 Map 防止冰块位置重叠导致目标数大于实际数
        const iceMap = new Map<string, number>();

        for(let r=0; r<8; r+=2) {
          for(let c=0; c<8; c+=2) {
            // 避开通往中心石头的格子
            if (!(r>=3 && r<=4 && c>=3 && c<=4)) {
              let layers = 1;
              if (chapter === 0) layers = Math.random() < 0.5 ? 1 : 2;
              else if (chapter === 1) layers = Math.random() < 0.5 ? 2 : 3;
              else layers = Math.random() < 0.5 ? 3 : 4;
              iceMap.set(`${r},${c}`, layers);
            }
          }
        }
        
        // 补充零散的厚冰
        let extraLayer1 = chapter === 0 ? 2 : (chapter === 1 ? 3 : 4);
        let extraLayer2 = chapter === 0 ? 1 : (chapter === 1 ? 2 : 3);
        iceMap.set(`1,3`, extraLayer1);
        iceMap.set(`6,4`, extraLayer2);

        // 转换为数组并计算总层数
        lvl.obstacles.ices = Array.from(iceMap.entries()).map(([key, layers]) => {
          const [r, c] = key.split(',').map(Number);
          return { r, c, layers };
        });

        const totalIceLayers = lvl.obstacles.ices.reduce((sum, ice) => sum + ice.layers, 0);
        // 目标数量设定为总层数的 60%，确保玩家绝对能打破
        lvl.goals = [{ type: 'clearIce', count: Math.floor(totalIceLayers * 0.6) }];

      } else {
        // === 普通关卡只有收集任务，无任何障碍物 ===
        const el1 = (i * 2) % elementTypes + 1; 
        const count1 = 15 + chapter * 5 + (i % 3) * 5; 

        if (i % 2 === 0) {
          // 偶数关：双元素收集
          const el2 = (el1 % elementTypes) + 1;
          lvl.goals = [
            { type: 'collect', element: el1, count: count1 },
            { type: 'collect', element: el2, count: Math.floor(count1 * 0.8) }
          ];
        } else {
          // 奇数关：单元素收集
          lvl.goals = [{ type: 'collect', element: el1, count: count1 }];
        }
      }
      
      this.cache.json.add(`level-${i}`, lvl); 
    }
  }
}