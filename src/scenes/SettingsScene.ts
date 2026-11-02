import Phaser from 'phaser';
import { progress } from '../app/ProgressService';
import { audio } from '../infra/AudioService';

export class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create(): void {
    const scale = progress.settings.careMode ? 1.3 : 1.0;
    
    this.add.text(300, 50, '设置', { 
      fontSize: `${36 * scale}px`, color: '#fff', padding: { y: 8 } 
    }).setOrigin(0.5, 0);

    const createToggle = (y: number, label: string, key: 'careMode'|'music'|'sfx') => {
      const val = progress.settings[key];
      const btn = this.add.text(300, y, `${label}: ${val ? '开启' : '关闭'}`, {
        fontSize: `${22 * scale}px`, color: val ? '#4ecdc4' : '#aaaaaa', 
        backgroundColor: '#333344', padding: { x: 20, y: 10 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        const next = !progress.settings[key];
        progress.setSetting(key, next);
        if (key === 'music') {
          if (next) audio.playBgm('menu');
          else audio.stopBgm();
        }
        this.scene.restart(); 
      });
    };

    // 昵称显示与修改
    const nameBtn = this.add.text(300, 160, `昵称: ${progress.nickname} (点击修改)`, {
      fontSize: `${22 * scale}px`, color: '#4ecdc4', backgroundColor: '#333344', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nameBtn.on('pointerdown', () => {
      const newName = window.prompt('请输入你的新昵称 (最多12个字):', progress.nickname);
      if (newName) {
        progress.setNickname(newName);
        this.scene.restart();
      }
    });

    createToggle(260, '关怀模式', 'careMode');
    createToggle(340, '音乐', 'music');
    createToggle(420, '音效', 'sfx');

    const ruleBtn = this.add.text(300, 520, '📖 规则说明', {
      fontSize: `${22 * scale}px`, color: '#ffe66d', backgroundColor: '#333344', padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    ruleBtn.on('pointerdown', () => this.scene.start('RuleScene'));

    const back = this.add.text(300, 650, '返回', {
      fontSize: `${24 * scale}px`, color: '#1a1a2e', backgroundColor: '#ffe66d', padding: { x: 40, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('LevelSelectScene'));
  }
}