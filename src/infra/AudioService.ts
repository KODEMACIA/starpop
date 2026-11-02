export class AudioService {
  private ctx: AudioContext | null = null;
  private bgmTimeout: any = null;
  private bgmGain: GainNode | null = null;
  private currentBgm = '';
  private isPlayingBgm = false;

  init(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.2; // <--- 把 BGM 音量从 0.05 调到了 0.2
      this.bgmGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 播放背景音乐
  playBgm(track: 'menu' | 'game' | 'result'): void {
    if (!this.ctx) this.init();
    if (this.currentBgm === track) return; // 避免重复播放打断
    
    this.stopBgm();
    this.currentBgm = track;
    this.isPlayingBgm = true;

    // 不同场景的音符序列 (Hz)
    const tracks = {
      menu: [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00], // 舒缓
      game: [392.00, 440.00, 493.88, 587.33, 493.88, 440.00, 392.00, 329.63], // 紧凑
      result: [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25]                // 凯旋
    };

    const notes = tracks[track];
    let index = 0;

    const playNext = () => {
      if (!this.isPlayingBgm || this.currentBgm !== track) return;
      
      const freq = notes[index];
      this.playTone(freq, 0.2, 'triangle', this.bgmGain!); // 稍微拉长一点单音持续
      
      index = (index + 1) % notes.length;
      
      // 控制节奏速度 (BPM)
      const delay = track === 'menu' ? 400 : (track === 'game' ? 250 : 300);
      this.bgmTimeout = setTimeout(playNext, delay);
    };

    playNext();
  }

  // 停止音乐
  stopBgm(): void {
    this.isPlayingBgm = false;
    this.currentBgm = '';
    if (this.bgmTimeout) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
  }

  // 基础音色播放
  private playTone(freq: number, duration: number, type: OscillatorType, dest: AudioNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playEliminate(): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playCombo(level: number): void {
    if (!this.ctx) return;
    const baseFreq = 400 + (level * 100);
    [baseFreq, baseFreq * 1.5].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      gain.gain.setValueAtTime(0, this.ctx!.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx!.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + i * 0.05);
      osc.stop(this.ctx!.currentTime + 0.4);
    });
  }

  playExplosion(): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playClearScreen(): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.8);
  }

  playWin(): void {
    if (!this.ctx) return;
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + i * 0.1);
      osc.stop(this.ctx!.currentTime + i * 0.1 + 0.5);
    });
  }
}

export const audio = new AudioService();