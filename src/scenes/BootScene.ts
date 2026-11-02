import Phaser from 'phaser';
import { progress } from '../app/ProgressService';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  
  async create() {
    this.add.text(300, 400, '加载中...', { fontSize: '24px', color: '#ffffff', padding: { y: 8 } }).setOrigin(0.5);
    await progress.load();
    this.scene.start('LevelSelectScene');
  }
}