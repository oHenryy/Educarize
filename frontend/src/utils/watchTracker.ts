/**
 * Conta o tempo efetivamente assistido a partir de amostras periódicas do player.
 *
 * Só soma o avanço entre duas amostras consecutivas com o vídeo tocando e quando o salto é
 * pequeno (reprodução normal, inclusive em velocidade 2x). Pular para frente, voltar ou ficar
 * pausado não conta.
 */
export class WatchTracker {
  private lastTime: number | null = null;
  private pending = 0;

  /** Maior avanço aceito entre duas amostras (amostras a cada ~1s; folga para 2x e pequenos atrasos). */
  static readonly MAX_STEP_SECONDS = 3;

  sample(currentTime: number, playing: boolean): void {
    if (playing && this.lastTime !== null) {
      const step = currentTime - this.lastTime;
      if (step > 0 && step <= WatchTracker.MAX_STEP_SECONDS) {
        this.pending += step;
      }
    }
    this.lastTime = playing ? currentTime : null;
  }

  /** Segundos inteiros acumulados desde o último envio (a fração fica para o próximo). */
  takeWatchedSeconds(max = 120): number {
    const whole = Math.min(Math.floor(this.pending), max);
    this.pending -= whole;
    return whole;
  }

  get pendingSeconds(): number {
    return this.pending;
  }
}
