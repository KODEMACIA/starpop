import Phaser from 'phaser';
import type { Cell, GameEvent, LevelConfig, Move } from '../core/types';
import { applyMove } from '../core/applyMove';
import { hasPossibleMove, shuffleBoard } from '../core/deadlockChecker';
import { rateStars } from '../core/starRater';
import { findHint } from '../core/hintFinder';
import { collapse, spawn } from '../core/gravityResolver';
import { progress } from '../app/ProgressService';
import { LevelSession } from '../app/LevelSession';
import { audio } from '../infra/AudioService';
import { levelRegistry } from '../app/LevelRegistry';

const CELL = 60;
const OFFSET_X = 60;
const OFFSET_Y = 180;

const COLORS = [0x000000, 0xff7675, 0x4ecdc4, 0xffeaa7, 0xa29bfe, 0x55efc4, 0xfd79a8];
const EMOJIS = ['', '🦊', '🐳', '🐥', '🦉', '🐢', '🐷'];
const ANIMAL_NAMES = ['', '狐狸', '鲸鱼', '小鸡', '猫头鹰', '乌龟', '小猪'];

export class GameScene extends Phaser.Scene {
  private levelId = 1;
  private config!: LevelConfig;
  private session!: LevelSession;
  private tiles: Phaser.GameObjects.Container[][] = [];
  private iceLayer!: Phaser.GameObjects.Graphics;
  private selected: Cell | null = null;
  private busy = false;
  private activeTool: 'brush' | null = null;

  private scoreText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private starText!: Phaser.GameObjects.Text;
  private settleBtn?: Phaser.GameObjects.Rectangle;

  private hintText!: Phaser.GameObjects.Text;
  private moveText!: Phaser.GameObjects.Text;
  private brushText!: Phaser.GameObjects.Text;
  private shuffleText!: Phaser.GameObjects.Text;

  private idleTimer?: Phaser.Time.TimerEvent;

  constructor() { super('GameScene'); }

  init(data: { levelId?: number }): void {
    this.levelId = data.levelId ?? 1;
    this.busy = false;
    this.selected = null;
    this.activeTool = null;
    this.settleBtn = undefined;
  }

  create(): void {
    audio.init();
    if (progress.settings.music) {
      audio.playBgm('game');
    } else {
      audio.stopBgm();
    }
    
    this.config = levelRegistry[this.levelId];
    if (!this.config) return;

    this.session = new LevelSession(this.config);
    if (progress.settings.careMode) {
      this.session.movesLeft = Math.floor(this.config.movesLimit * 1.2);
    }

    if (!hasPossibleMove(this.session.board, this.session.obstacles)) {
      this.session.board = shuffleBoard(this.session.board, this.session.obstacles, this.session.rules);
    }

    const scale = progress.settings.careMode ? 1.25 : 1.0;
    this.createBackButton();
    this.createBottomBar();

    this.scoreText = this.add.text(540, 25, '得分: 0', { fontSize: `${22 * scale}px`, color: '#ffffff', padding: { y: 6 } }).setOrigin(1, 0);
    this.movesText = this.add.text(540, 65, '', { fontSize: `${22 * scale}px`, color: '#ffffff', padding: { y: 6 } }).setOrigin(1, 0);
    this.goalText = this.add.text(60, 75, '', { fontSize: `${20 * scale}px`, color: '#aaaaaa', padding: { y: 6 } });
    this.starText = this.add.text(60, 115, '', { fontSize: `${32 * scale}px`, color: '#ffe66d', padding: { y: 6 } });

    this.iceLayer = this.add.graphics();

    this.buildTiles();
    this.syncTiles();
    this.refreshHud();
    this.input.on('pointerdown', this.onPointerDown, this);

    this.resetIdleTimer();
  }

  private createBackButton(): void {
    const backBtn = this.add.text(20, 25, '← 返回', {
      fontSize: '20px', color: '#aaaaaa', backgroundColor: '#2a2a40', padding: { x: 10, y: 8 }
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#aaaaaa'));
    backBtn.on('pointerdown', () => this.showQuitConfirm());
  }

  private createBottomBar(): void {
    const y = 720;
    const createBtn = (x: number, label: string, cb: () => void) => {
      const rect = this.add.rectangle(x, y, 110, 46, 0x333344).setStrokeStyle(2, 0x555566);
      const text = this.add.text(x, y, label, { fontSize: '16px', color: '#ffffff', padding: { y: 4 } }).setOrigin(0.5);
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', cb);
      return text;
    };
    this.hintText = createBtn(100, '', () => this.useHint(false));
    this.moveText = createBtn(230, '', () => this.useExtraMoves());
    this.brushText = createBtn(360, '', () => this.useBrushTool());
    this.shuffleText = createBtn(490, '', () => this.useShuffle());
  }

  private showQuitConfirm(): void {
    if (this.busy) return;
    this.busy = true;
    const overlay = this.add.rectangle(300, 400, 600, 800, 0x000000, 0.75).setDepth(100);
    const dialog = this.add.rectangle(300, 400, 400, 220, 0x1a1a2e).setStrokeStyle(2, 0x4ecdc4).setDepth(101);
    const text = this.add.text(300, 340, '确定要退出本局吗？\n当前进度将不会保存', { fontSize: '20px', color: '#ffffff', align: 'center', padding: { y: 8 } }).setOrigin(0.5).setDepth(101);
    const yesBtn = this.add.text(200, 440, '退出', { fontSize: '22px', color: '#ff6b6b', backgroundColor: '#333344', padding: { x: 24, y: 10 } }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    const noBtn = this.add.text(400, 440, '继续游戏', { fontSize: '22px', color: '#4ecdc4', backgroundColor: '#333344', padding: { x: 24, y: 10 } }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
    yesBtn.on('pointerdown', () => this.scene.start('LevelSelectScene'));
    noBtn.on('pointerdown', () => {
      overlay.destroy(); dialog.destroy(); text.destroy(); yesBtn.destroy(); noBtn.destroy(); this.busy = false;
    });
  }

  private buildTiles(): void {
    this.tiles = [];
    for (let r = 0; r < this.config.board.rows; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < this.config.board.cols; c++) {
        const x = OFFSET_X + c * CELL + CELL / 2;
        const y = OFFSET_Y + r * CELL + CELL / 2;
        const val = this.session.board[r][c];
        
        const isRock = val === 99;
        const bg = this.add.rectangle(0, 0, CELL - 6, CELL - 6, isRock ? 0x555555 : (COLORS[val % 100] ?? 0x888888))
          .setStrokeStyle(2, 0xffffff, 0.2);
        
        const emoji = isRock ? '🪨' : (EMOJIS[val % 100] ?? '');
        const txt = this.add.text(0, 0, emoji, { fontSize: '32px', padding: { y: 4 } }).setOrigin(0.5);
        
        let badgeText = '';
        if (val >= 400) badgeText = '🌋';
        else if (val >= 300) badgeText = '💥';
        else if (val >= 200) badgeText = '💣';
        else if (val >= 100) badgeText = '⚡';
        const badge = this.add.text(12, -12, badgeText, { fontSize: '18px' }).setOrigin(0.5);

        const container = this.add.container(x, y, [bg, txt, badge]);
        this.tiles[r][c] = container;
      }
    }
  }

  private syncTiles(): void {
    this.iceLayer.clear();
    
    for (let r = 0; r < this.config.board.rows; r++) {
      for (let c = 0; c < this.config.board.cols; c++) {
        const iceLayers = this.session.obstacles[r][c];
        const t = this.tiles[r][c];

        if (iceLayers > 0) t.setAlpha(0.4); 
        else t.setAlpha(1);

        if (iceLayers > 0) {
          const x = OFFSET_X + c * CELL;
          const y = OFFSET_Y + r * CELL;
          const alpha = 0.3 + iceLayers * 0.1; 
          const colors = [0x000000, 0x88ccff, 0x5599ff, 0x3377ff, 0x1155ff];
          this.iceLayer.fillStyle(colors[iceLayers] || 0x1155ff, Math.min(alpha, 0.7));
          this.iceLayer.fillRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
          
          this.iceLayer.lineStyle(3, 0xffffff, 0.9);
          this.iceLayer.strokeRoundedRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
          
          this.iceLayer.lineStyle(2, 0xffffff, 0.6);
          this.iceLayer.beginPath();
          this.iceLayer.moveTo(x + 8, y + 8);
          this.iceLayer.lineTo(x + CELL - 8, y + CELL - 8);
          
          if (iceLayers >= 2) {
            this.iceLayer.moveTo(x + 8, y + CELL - 8);
            this.iceLayer.lineTo(x + CELL - 8, y + 8);
          }
          if (iceLayers >= 3) {
             this.iceLayer.moveTo(x + CELL/2, y + 5);
             this.iceLayer.lineTo(x + CELL/2, y + CELL - 5);
          }
          if (iceLayers >= 4) {
             this.iceLayer.moveTo(x + 5, y + CELL/2);
             this.iceLayer.lineTo(x + CELL - 5, y + CELL/2);
          }
          this.iceLayer.strokePath();
          
          this.iceLayer.fillStyle(0xffffff, 1);
          for (let i = 0; i < iceLayers; i++) {
            this.iceLayer.fillCircle(x + 12 + i * 10, y + CELL - 10, 3);
          }
        }

        const val = this.session.board[r][c];
        const realVal = val % 100;
        const isRock = val === 99;
        
        const bg = t.list[0] as Phaser.GameObjects.Rectangle;
        const txt = t.list[1] as Phaser.GameObjects.Text;
        const badge = t.list[2] as Phaser.GameObjects.Text;
        
        if (isRock) {
          bg.setFillStyle(0x555555);
          bg.setStrokeStyle(2, 0x000000, 1);
          badge.setText('');
          txt.setText('🪨');
          this.tweens.killTweensOf(t);
          t.setScale(1);
        } else if (val >= 400) {
          bg.setFillStyle(0xff0000);
          bg.setStrokeStyle(4, 0xffffff, 1);
          badge.setText('🌋');
          txt.setText(EMOJIS[realVal] ?? '');
          if (!this.tweens.isTweening(t)) this.tweens.add({ targets: t, scaleX: 1.2, scaleY: 1.2, yoyo: true, repeat: -1, duration: 300 });
        } else if (val >= 300) {
          bg.setFillStyle(0x9b59b6);
          bg.setStrokeStyle(4, 0xffffff, 1);
          badge.setText('💥');
          txt.setText(EMOJIS[realVal] ?? '');
          if (!this.tweens.isTweening(t)) this.tweens.add({ targets: t, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 350 });
        } else if (val >= 200) {
          bg.setFillStyle(0xff4757);
          bg.setStrokeStyle(4, 0xffffff, 1);
          badge.setText('💣');
          txt.setText(EMOJIS[realVal] ?? '');
          if (!this.tweens.isTweening(t)) this.tweens.add({ targets: t, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 400 });
        } else if (val >= 100) {
          bg.setFillStyle(0xffeaa7);
          bg.setStrokeStyle(4, 0xffffff, 1);
          badge.setText('⚡');
          txt.setText(EMOJIS[realVal] ?? '');
          if (!this.tweens.isTweening(t)) this.tweens.add({ targets: t, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 600 });
        } else {
          bg.setFillStyle(COLORS[realVal] ?? 0x888888);
          bg.setStrokeStyle(2, 0xffffff, 0.2);
          badge.setText('');
          txt.setText(EMOJIS[realVal] ?? '');
          this.tweens.killTweensOf(t);
          t.setScale(1);
        }
        
        t.setVisible(true);
        t.setPosition(OFFSET_X + c * CELL + CELL / 2, OFFSET_Y + r * CELL + CELL / 2);
      }
    }
  }

  private refreshHud(): void {
    this.scoreText.setText(`得分: ${this.session.score}`);
    this.movesText.setText(`步数: ${this.session.movesLeft}`);
    
    const goalStr = this.session.progress.map(p => {
      if (p.goal.type === 'collect') return `${ANIMAL_NAMES[p.goal.element]} ${p.current}/${p.goal.count}`;
      if (p.goal.type === 'clearIce') return `❄️破冰 ${p.current}/${p.goal.count}`;
      return '';
    }).join('   ');
    
    this.goalText.setText(`目标: ${goalStr}`);
    const stars = rateStars(this.session.score, this.config.starThresholds.scores);
    this.starText.setText('★'.repeat(stars) + '☆'.repeat(3 - stars));
    
    this.hintText.setText(`提示 (${this.session.hintQuotaLeft})`);
    this.moveText.setText(`+5步 (${this.session.extraMovesCount})`);
    this.brushText.setText(`点睛笔 (${this.session.brushCount})`);
    this.shuffleText.setText(`洗牌 (${this.session.shuffleCount})`);
    
    if (this.session.phase === 'CHALLENGE') this.scoreText.setText(`得分: ${this.session.score}  (挑战中)`);
  }

  private cellFromPointer(px: number, py: number): Cell | null {
    const c = Math.floor((px - OFFSET_X) / CELL);
    const r = Math.floor((py - OFFSET_Y) / CELL);
    if (r < 0 || r >= this.config.board.rows || c < 0 || c >= this.config.board.cols) return null;
    return { r, c };
  }

  private showLockedEffect(r: number, c: number): void {
    const t = this.tiles[r][c];
    const originX = OFFSET_X + c * CELL + CELL / 2;
    this.tweens.add({
      targets: t, x: originX + 4, yoyo: true, repeat: 3, duration: 40,
      onComplete: () => t.setPosition(originX, OFFSET_Y + r * CELL + CELL / 2)
    });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) this.idleTimer.destroy();
    this.idleTimer = this.time.delayedCall(10000, () => {
      if (!this.busy && (this.session.phase === 'INPUT_OPEN' || this.session.phase === 'CHALLENGE')) {
        this.useHint(true); 
      }
    });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.busy) return;
    if (this.session.phase !== 'INPUT_OPEN' && this.session.phase !== 'CHALLENGE') return;
    
    this.resetIdleTimer();

    if (this.settleBtn && this.settleBtn.getBounds().contains(pointer.x, pointer.y)) { void this.settleWithEggs('player'); return; }
    
    const cell = this.cellFromPointer(pointer.x, pointer.y);
    if (!cell) return;

    if (this.session.obstacles[cell.r][cell.c] > 0) {
      this.showLockedEffect(cell.r, cell.c);
      return; 
    }

    if (this.activeTool === 'brush') {
      this.activeTool = null;
      this.input.setDefaultCursor('default');
      void this.performBrush(cell.r, cell.c);
      return;
    }
    
    if (!this.selected) {
      this.selected = cell;
      const bg = this.tiles[cell.r][cell.c].list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(4, 0xffffff);
      return;
    }
    const first = this.selected;
    const prevBg = this.tiles[first.r][first.c].list[0] as Phaser.GameObjects.Rectangle;
    prevBg.setStrokeStyle(2, 0xffffff, 0.2);
    this.selected = null;
    
    if (first.r === cell.r && first.c === cell.c) return;
    
    const adjacent = Math.abs(first.r - cell.r) + Math.abs(first.c - cell.c) === 1;
    if (!adjacent) {
      this.selected = cell;
      const bg = this.tiles[cell.r][cell.c].list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(4, 0xffffff);
      return;
    }
    void this.performMove({ r1: first.r, c1: first.c, r2: cell.r, c2: cell.c });
  }

  private async performMove(move: Move): Promise<void> {
    this.busy = true;
    try {
      await this.animateSwap(move);
      const result = applyMove(this.session.board, this.session.obstacles, move, this.session.rules);
      if (!result) {
        await this.animateSwap(move);
        return;
      }
      this.session.board = result.board;
      this.session.obstacles = result.obstacles;
      this.session.consumeMove();
      this.session.score += result.scoreDelta;
      this.session.applyRemoved(result.removed, result.iceCleared);
      
      await this.playEvents(result.events);
      this.syncTiles();
      this.refreshHud();

      if (!hasPossibleMove(this.session.board, this.session.obstacles)) {
        this.session.board = shuffleBoard(this.session.board, this.session.obstacles, this.session.rules);
        this.syncTiles();
      }
      if (this.session.goalsDone() && this.session.phase === 'INPUT_OPEN') {
        this.session.phase = 'CHALLENGE';
        this.showSettleButton();
        this.refreshHud();
      }
      if (this.session.movesLeft <= 0) {
        void this.settleWithEggs(this.session.phase === 'CHALLENGE' ? 'player' : 'exhausted');
        return;
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (this.scene.isActive()) this.busy = false;
      this.resetIdleTimer();
    }
  }

  private async performBrush(r: number, c: number): Promise<void> {
    const val = this.session.board[r][c];
    if (val === 99 || val >= 100) return; 

    this.busy = true;
    try {
      this.session.usedItems = true;
      this.session.brushCount--;
      
      const t = this.tiles[r][c];
      this.tweens.add({ targets: t, scaleX: 1.4, scaleY: 1.4, duration: 150, yoyo: true });

      const baseVal = val % 100;
      this.session.board[r][c] = 100 + baseVal;

      this.syncTiles();
      this.refreshHud();

      if (!hasPossibleMove(this.session.board, this.session.obstacles)) {
        this.session.board = shuffleBoard(this.session.board, this.session.obstacles, this.session.rules);
        this.syncTiles();
      }
    } catch(e) {
      console.error(e);
    } finally {
      this.busy = false;
      this.resetIdleTimer();
    }
  }

  private useHint(isAuto: boolean): void {
    if (this.busy) return;
    if (!isAuto && this.session.hintQuotaLeft <= 0) return;
    
    const move = findHint(this.session.board, this.session.obstacles);
    if (!move) return;
    
    if (!isAuto) {
      this.session.hintQuotaLeft--;
      this.refreshHud();
      this.resetIdleTimer();
    }

    const a = this.tiles[move.r1][move.c1];
    const b = this.tiles[move.r2][move.c2];
    this.tweens.add({ targets: [a, b], scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: 3, duration: 200 });
  }

  private useExtraMoves(): void {
    if (this.busy || this.session.extraMovesCount <= 0) return;
    this.session.extraMovesCount--;
    this.session.movesLeft += 5;
    this.session.usedItems = true;
    this.refreshHud();
    this.resetIdleTimer();
  }

  private useBrushTool(): void {
    if (this.busy || this.session.brushCount <= 0) return;
    this.activeTool = 'brush';
    this.input.setDefaultCursor('crosshair');
  }

  private useShuffle(): void {
    if (this.busy || this.session.shuffleCount <= 0) return;
    this.session.shuffleCount--;
    this.session.usedItems = true;
    if (this.selected) {
      const bg = this.tiles[this.selected.r][this.selected.c].list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, 0xffffff, 0.2);
      this.selected = null;
    }
    this.session.board = shuffleBoard(this.session.board, this.session.obstacles, this.session.rules);
    this.syncTiles();
    this.refreshHud();
    this.resetIdleTimer();
  }

  private animateSwap(move: Move): Promise<void> {
    const a = this.tiles[move.r1][move.c1];
    const b = this.tiles[move.r2][move.c2];
    const ax = a.x, ay = a.y, bx = b.x, by = b.y;
    this.tiles[move.r1][move.c1] = b;
    this.tiles[move.r2][move.c2] = a;
    return new Promise(resolve => {
      this.tweens.add({ targets: a, x: bx, y: by, duration: 150 });
      this.tweens.add({ targets: b, x: ax, y: ay, duration: 150, onComplete: () => resolve() });
    });
  }

  private async playEvents(events: GameEvent[]): Promise<void> {
    for (const ev of events) {
      const isScreenClear = ev.cells.length >= 30; 
      if (isScreenClear) {
        audio.playClearScreen();
        this.cameras.main.flash(400, 255, 255, 255);
        this.showComboText(5);
      } else {
        audio.playEliminate();
        let comboLevel = 0;
        if (ev.wave >= 2) comboLevel = ev.wave;
        if (ev.matchCount >= 2) comboLevel = Math.max(comboLevel, ev.matchCount);
        if (comboLevel >= 2) {
          audio.playCombo(comboLevel);
          this.showComboText(comboLevel);
        }
      }
      if (!isScreenClear && ev.cells.length > 8) {
        audio.playExplosion();
        this.cameras.main.shake(200, 0.015);
      }
      await this.animateEliminate(ev.cells);
      this.session.board = ev.boardAfter;
      this.session.obstacles = ev.obstaclesAfter;
      this.syncTiles();
      await this.delay(isScreenClear ? 500 : 120); 
    }
  }

  private showComboText(level: number) {
    let textStr = '';
    let color = '';
    if (level === 2) { textStr = 'Good!'; color = '#55efc4'; } 
    else if (level === 3) { textStr = 'Excellent!'; color = '#fdcb6e'; } 
    else if (level === 4) { textStr = 'Unbelievable!'; color = '#a29bfe'; } 
    else { textStr = 'GODLIKE!!'; color = '#ff7675'; }

    const txt = this.add.text(300, 400, textStr, {
      fontSize: '48px', color: color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 6, padding: { x: 10, y: 10 }
    }).setOrigin(0.5).setDepth(200).setScale(0.5).setAlpha(0);

    this.tweens.add({
      targets: txt, scaleX: 1.2, scaleY: 1.2, alpha: 1, duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt, scaleX: 1, scaleY: 1, y: 350, alpha: 0, duration: 500, delay: 300, onComplete: () => txt.destroy()
        });
      }
    });
  }

  private animateEliminate(cells: Cell[]): Promise<void> {
    if (cells.length === 0) return Promise.resolve();
    const unique = new Map<string, Cell>();
    for(const c of cells) unique.set(`${c.r},${c.c}`, c);
    const list = Array.from(unique.values());

    return new Promise(resolve => {
      let done = 0;
      for (const cell of list) {
        const t = this.tiles[cell.r][cell.c];
        this.tweens.add({
          targets: t, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 150,
          onComplete: () => { done++; if (done === list.length) resolve(); }
        });
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  private showSettleButton(): void {
    const y = 640;
    this.settleBtn = this.add.rectangle(200, y, 200, 50, 0xffe66d).setOrigin(0);
    this.add.text(300, y + 13, '结算结束', { fontSize: '20px', color: '#1a1a2e', padding: { y: 4 } }).setOrigin(0.5, 0);
  }

  private async settleWithEggs(reason: 'player' | 'exhausted'): Promise<void> {
    this.busy = true;
    if (this.idleTimer) this.idleTimer.destroy(); 
    if (this.settleBtn) this.settleBtn.destroy();

    let safety = 0;
    
    while (safety < 30) {
      safety++;
      const queue: Cell[] = [];
      const toClear = new Set<string>(); 
      const processed = new Set<string>();
      
      for (let r = 0; r < this.config.board.rows; r++) {
        for (let c = 0; c < this.config.board.cols; c++) {
          const val = this.session.board[r][c];
          if (val >= 100 && val < 400) {
            queue.push({r, c});
            break; 
          }
        }
        if (queue.length > 0) break;
      }

      if (queue.length === 0) break;

      while (queue.length > 0) {
        const egg = queue.shift()!;
        const key = `${egg.r},${egg.c}`;
        if (processed.has(key)) continue;
        processed.add(key);
        toClear.add(key);

        const val = this.session.board[egg.r][egg.c];
        const type = Math.floor(val / 100);
        if (type >= 4) continue;

        const affected: Cell[] = [];
        if (type === 1) {
          const isH = Math.random() < 0.5;
          if (isH) {
            for(let c=0; c<this.config.board.cols; c++) affected.push({r: egg.r, c});
          } else {
            for(let r=0; r<this.config.board.rows; r++) affected.push({r, c: egg.c});
          }
        } else {
          const radius = type; 
          for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
              const nr = egg.r + dr;
              const nc = egg.c + dc;
              if (nr >= 0 && nr < this.config.board.rows && nc >= 0 && nc < this.config.board.cols) {
                affected.push({r: nr, c: nc});
              }
            }
          }
        }

        for (const cell of affected) {
          const k = `${cell.r},${cell.c}`;
          if (processed.has(k)) continue;
          const v = this.session.board[cell.r][cell.c];
          if (v >= 100 && v < 400) {
            queue.push(cell);
          } else if (v < 100 && v !== 99) {
            toClear.add(k);
          }
        }
      }

      if (toClear.size > 0) {
        const cellsList = Array.from(toClear).map(k => {
          const [r, c] = k.split(',').map(Number);
          return {r, c};
        });
        
        audio.playExplosion();
        this.cameras.main.shake(200, 0.02);
        
        await this.animateEliminate(cellsList);
        
        let gainedScore = 0;
        for (const c of cellsList) {
          this.session.board[c.r][c.c] = 0;
          gainedScore += 10; 
        }
        this.session.score += gainedScore;
        
        for (const cell of cellsList) {
          const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
          for (const [dr, dc] of dirs) {
            const nr = cell.r + dr;
            const nc = cell.c + dc;
            if (nr >= 0 && nr < this.config.board.rows && nc >= 0 && nc < this.config.board.cols) {
              if (this.session.obstacles[nr][nc] > 0) {
                this.session.obstacles[nr][nc]--;
                this.session.iceCleared++; // 【已修复】每破除一层冰，进度 +1
              }
            }
          }
        }

        const coll = collapse(this.session.board);
        const sp = spawn(coll.board, this.session.rules);
        this.session.board = sp.board;
        
        this.syncTiles();
        this.refreshHud();
        await this.delay(300);
      }
    }

    while (true) {
      const screenEggs: Cell[] = [];
      for (let r = 0; r < this.config.board.rows; r++) {
        for (let c = 0; c < this.config.board.cols; c++) {
          if (this.session.board[r][c] >= 400) {
            screenEggs.push({ r, c });
          }
        }
      }

      if (screenEggs.length === 0) break;

      screenEggs.shift();
      const keepEggs = screenEggs.map(pos => ({
        r: pos.r, c: pos.c, val: this.session.board[pos.r][pos.c]
      }));
      
      this.showComboText(5);
      audio.playClearScreen();
      this.cameras.main.shake(400, 0.04);
      this.cameras.main.flash(600, 255, 255, 255);
      
      for(let r=0; r<this.config.board.rows; r++){
        for(let c=0; c<this.config.board.cols; c++){
          if (this.session.board[r][c] !== 99) {
            this.session.board[r][c] = 0;
          }
          if (this.session.obstacles[r][c] > 0) {
            this.session.obstacles[r][c]--;
            this.session.iceCleared++; // 【已修复】每破除一层冰，进度 +1
          }
        }
      }
      
      this.session.score += 2000; 
      this.syncTiles();
      this.refreshHud();
      await this.delay(300);

      const coll = collapse(this.session.board);
      const sp = spawn(coll.board, this.session.rules);
      this.session.board = sp.board;

      for (const egg of keepEggs) {
        this.session.board[egg.r][egg.c] = egg.val;
      }
      
      this.syncTiles();
      this.refreshHud();
      await this.delay(600);
    }

    if (reason === 'player' && this.session.phase === 'CHALLENGE') {
      this.session.score += this.session.movesLeft * 100;
    }

    let finalScore = this.session.score;
    if (this.session.usedItems) {
      finalScore = Math.min(finalScore, this.config.starThresholds.scores[2]);
    }

    const stars = rateStars(finalScore, this.config.starThresholds.scores);
    const won = this.session.goalsDone();
    progress.commit(this.levelId, stars, finalScore, 18); 
    
    this.scene.start('ResultScene', {
      levelId: this.levelId, score: finalScore, stars, won, starThresholds: this.config.starThresholds.scores, usedItems: this.session.usedItems,
    });
  }
}