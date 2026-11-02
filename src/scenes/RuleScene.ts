import Phaser from 'phaser';
import { progress } from '../app/ProgressService';

export class RuleScene extends Phaser.Scene {
  constructor() { super('RuleScene'); }

  create(): void {
    const scale = progress.settings.careMode ? 1.1 : 1.0; 

    this.add.rectangle(300, 400, 600, 800, 0x0f0f1a, 1);

    this.add.text(300, 30, '📖 游戏规则', { 
      fontSize: `${28 * scale}px`, color: '#ffffff', fontStyle: 'bold', padding: { y: 8 } 
    }).setOrigin(0.5, 0);

    const titleStyle = { fontSize: `${16 * scale}px`, fontStyle: 'bold', padding: { y: 4 } };
    const textStyle = { fontSize: `${13 * scale}px`, color: '#aaaaaa', lineSpacing: 4, padding: { y: 4 } };

    let y = 80;

    // 1
    this.add.text(40, y, '【基础玩法】', { ...titleStyle, color: '#4ecdc4' });
    this.add.text(40, y + 25, '• 交换相邻的动物，凑齐 3 个及以上即可消除并得分。\n• 达成目标收集星星。每章集齐 14 颗星，解锁该章挑战关。', textStyle);
    
    // 2
    y = 165;
    this.add.text(40, y, '【障碍物说明】', { ...titleStyle, color: '#00b894' });
    this.add.text(40, y + 25, '• 🪨 石头：不可消除，不可交换，会随下落占据空间。\n• ❄️ 冰块：被冰冻的元素无法移动，相邻消除可破冰。', textStyle);

    // 3
    y = 260;
    this.add.text(40, y, '【特殊彩蛋】', { ...titleStyle, color: '#ffe66d' });
    this.add.text(40, y + 25, '• ⚡ 小彩蛋（4连）：随机消除所在行或列。\n• 💣 大彩蛋（5连）：产生 5x5 爆炸。\n• 💥 超级彩蛋（6连）：产生 7x7 爆炸。\n• 🌋 清屏彩蛋（7连）：直接全屏清空！', textStyle);

    // 4
    y = 410;
    this.add.text(40, y, '【挑战阶段】', { ...titleStyle, color: '#ff7675' });
    this.add.text(40, y + 25, '• 目标达成后进入「挑战阶段」。\n• 主动结算时，每剩 1 步可额外转化 100 分。\n• 结算时自动引爆场上所有彩蛋。', textStyle);

    // 5
    y = 520;
    this.add.text(40, y, '【道具说明】', { ...titleStyle, color: '#a29bfe' });
    this.add.text(40, y + 25, '• 💡 提示：高亮显示一组可以消除的方块。\n• ➕ 加步：额外增加 5 个步数。\n• 🖌️ 点睛笔：将任意方块变为小彩蛋。\n• 🔄 洗牌：重新打乱棋盘，保证有解。\n• 注意：使用过任意道具后，本局得分将被限制在三星门槛内。\n• 挂机 10 秒，系统会自动提供一次免费提示。', textStyle);

    const backBtn = this.add.text(300, 730, '返回设置', {
      fontSize: `${20 * scale}px`, color: '#1a1a2e', backgroundColor: '#4ecdc4', padding: { x: 40, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => this.scene.start('SettingsScene'));
  }
}