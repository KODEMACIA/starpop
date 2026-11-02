import Phaser from 'phaser';
import { leaderboard } from '../app/LeaderboardGateway';
import { progress } from '../app/ProgressService';

export class RankScene extends Phaser.Scene {
  private currentMode: 'normal' | 'care' = 'normal';
  private currentType: 'total' | 'level' = 'total';
  private currentLevel = 1;
  private maxLevel = 18;
  private isLoading = false;

  private contentContainer!: Phaser.GameObjects.Container;
  private tabButtons: Phaser.GameObjects.Text[] = [];
  private levelSelectorContainer!: Phaser.GameObjects.Container;
  private levelText!: Phaser.GameObjects.Text;

  constructor() { super('RankScene'); }

  create(): void {
    this.isLoading = false;
    this.tabButtons = [];

    this.currentMode = progress.settings.careMode ? 'care' : 'normal';
    this.currentLevel = progress.unlocked > 0 ? Math.min(progress.unlocked, 18) : 1;

    this.add.text(300, 40, '排行榜', {
      fontSize: '32px', color: '#ffffff', padding: { y: 8 }
    }).setOrigin(0.5, 0);

    // 模式切换
    this.createTab(150, 100, '普通模式', () => this.switchMode('normal'));
    this.createTab(450, 100, '关怀模式', () => this.switchMode('care'));
    this.updateModeTabs();

    // 类型切换
    this.createTab(150, 160, '总分总榜', () => this.switchType('total'));
    this.createTab(450, 160, '关卡分榜', () => this.switchType('level'));
    this.updateTypeTabs();

    // 关卡选择器
    this.levelSelectorContainer = this.add.container(0, 0);
    const prevBtn = this.add.text(180, 220, '< 上一关', { fontSize: '18px', color: '#aaa', backgroundColor: '#333', padding: {x:10, y:5} })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const nextBtn = this.add.text(420, 220, '下一关 >', { fontSize: '18px', color: '#aaa', backgroundColor: '#333', padding: {x:10, y:5} })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    this.levelText = this.add.text(300, 220, `第 ${this.currentLevel} 关`, { fontSize: '20px', color: '#ffe66d', fontStyle: 'bold', padding: { y: 6 } }).setOrigin(0.5);

    prevBtn.on('pointerdown', () => { if (this.currentLevel > 1 && !this.isLoading) { this.currentLevel--; this.loadData(); } });
    nextBtn.on('pointerdown', () => { if (this.currentLevel < this.maxLevel && !this.isLoading) { this.currentLevel++; this.loadData(); } });
    
    this.levelSelectorContainer.add([prevBtn, nextBtn, this.levelText]);

    this.contentContainer = this.add.container(0, 0);

    const backBtn = this.add.text(300, 720, '返回', {
      fontSize: '22px', color: '#1a1a2e', backgroundColor: '#4ecdc4', padding: { x: 40, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('LevelSelectScene'));

    this.loadData();
  }

  private createTab(x: number, y: number, label: string, cb: () => void) {
    const btn = this.add.text(x, y, label, {
      fontSize: '18px', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', cb);
    this.tabButtons.push(btn);
  }

  private updateModeTabs() {
    if (!this.tabButtons[0]) return;
    this.tabButtons[0].setBackgroundColor(this.currentMode === 'normal' ? '#4ecdc4' : '#333344');
    this.tabButtons[0].setColor(this.currentMode === 'normal' ? '#1a1a2e' : '#aaa');
    this.tabButtons[1].setBackgroundColor(this.currentMode === 'care' ? '#4ecdc4' : '#333344');
    this.tabButtons[1].setColor(this.currentMode === 'care' ? '#1a1a2e' : '#aaa');
  }

  private updateTypeTabs() {
    if (!this.tabButtons[2]) return;
    this.tabButtons[2].setBackgroundColor(this.currentType === 'total' ? '#ffe66d' : '#333344');
    this.tabButtons[2].setColor(this.currentType === 'total' ? '#1a1a2e' : '#aaa');
    this.tabButtons[3].setBackgroundColor(this.currentType === 'level' ? '#ffe66d' : '#333344');
    this.tabButtons[3].setColor(this.currentType === 'level' ? '#1a1a2e' : '#aaa');
  }

  private switchMode(mode: 'normal' | 'care') {
    if (this.currentMode === mode || this.isLoading) return;
    this.currentMode = mode;
    this.updateModeTabs();
    this.loadData();
  }

  private switchType(type: 'total' | 'level') {
    if (this.currentType === type || this.isLoading) return;
    this.currentType = type;
    this.updateTypeTabs();
    this.levelSelectorContainer.setVisible(this.currentType === 'level');
    this.loadData();
  }

  private async loadData() {
    if (this.isLoading) return;
    this.isLoading = true;

    this.contentContainer.removeAll(true);
    this.levelSelectorContainer.setVisible(this.currentType === 'level');
    this.levelText.setText(`第 ${this.currentLevel} 关`);
    
    const loadingText = this.add.text(300, 350, '加载中...', { fontSize: '20px', color: '#aaa', padding: { y: 6 } }).setOrigin(0.5);
    this.contentContainer.add(loadingText);

    try {
      const entries = await leaderboard.fetchBoard(
        this.currentMode, 
        this.currentType, 
        this.currentType === 'level' ? this.currentLevel : undefined
      );

      if (!this.scene.isActive()) return;

      this.contentContainer.removeAll(true);

      if (entries.length === 0) {
        this.contentContainer.add(this.add.text(300, 350, '暂无数据，快去打一局吧！', { fontSize: '18px', color: '#aaa', padding: { y: 6 } }).setOrigin(0.5));
        return;
      }

      entries.forEach((entry, index) => {
        const y = 280 + index * 45;
        const color = index === 0 ? '#ffe66d' : index === 1 ? '#e0e0e0' : index === 2 ? '#cd7f32' : '#ffffff';
        
        this.contentContainer.add(this.add.text(120, y, `${index + 1}`, {
          fontSize: '22px', color, fontStyle: 'bold', padding: { y: 6 }
        }).setOrigin(0.5));

        // 匹配当前玩家昵称进行高亮
        this.contentContainer.add(this.add.text(220, y, entry.nickname, {
          fontSize: '20px', color: entry.nickname === progress.nickname ? '#4ecdc4' : color, padding: { y: 6 }
        }).setOrigin(0, 0.5));

        this.contentContainer.add(this.add.text(480, y, `${entry.score}`, {
          fontSize: '20px', color, padding: { y: 6 }
        }).setOrigin(1, 0.5));
      });
    } catch (e) {
      console.error("加载排行榜失败", e);
    } finally {
      this.isLoading = false;
    }
  }
}