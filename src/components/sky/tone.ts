/** 六个分类各发一个音，音量跟该分类此刻的共振走。必须在用户手势里构造。 */

const SCALE = [196, 247, 294, 349, 392, 494, 587];

export class SkyTone {
  private ctx: AudioContext;
  private gains: GainNode[];

  constructor(voices: number) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const master = this.ctx.createGain();
    master.gain.value = 0.85;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.6;
    master.connect(filter);
    filter.connect(this.ctx.destination);
    this.gains = Array.from({ length: voices }, (_, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = SCALE[i % SCALE.length];
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      return gain;
    });
  }

  resume(): Promise<void> {
    if (this.ctx.state === "running") return Promise.resolve();
    return this.ctx.resume().then(() => undefined);
  }

  /** levels 为 0–1，每路音量上限压得很低。 */
  setBands(levels: number[]) {
    const now = this.ctx.currentTime;
    this.gains.forEach((gain, i) => {
      const level = Math.max(0, Math.min(1, levels[i] ?? 0));
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(level * 0.035, now + 0.12);
    });
  }

  stop() {
    const now = this.ctx.currentTime;
    for (const gain of this.gains) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0, now);
    }
    void this.ctx.close();
  }
}
