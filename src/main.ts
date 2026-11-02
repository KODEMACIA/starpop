import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { SettingsScene } from './scenes/SettingsScene';
import { RankScene } from './scenes/RankScene';
import { RuleScene } from './scenes/RuleScene'; // 导入规则场景

new Phaser.Game({
  type: Phaser.AUTO,
  width: 600,
  height: 800,
  backgroundColor: '#1a1a2e',
  parent: 'app',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, LevelSelectScene, GameScene, ResultScene, SettingsScene, RankScene, RuleScene], // 注册
});