import Phaser from "phaser";

/**
 * Thanh progress dùng chung cho popup Thử Thách 7 Ngày — horizontal (tiến độ nhiệm vụ trong ngày, fill từ
 * trái sang phải) hoặc vertical (tổng sao tích lũy tới các mốc milestone, fill từ DƯỚI lên TRÊN — mốc 0 sao
 * ở đáy). Cố tình KHÔNG dùng origin-anchor để mọc fill (dễ vỡ giữa Canvas/WebGL renderer) — mỗi lần cập nhật
 * tự tính lại cả size lẫn vị trí (x/y) của rectangle fill, đảm bảo mép cố định (trái với horizontal, đáy với
 * vertical) luôn đúng chỗ bất kể renderer.
 */
export class ChallengeProgressBar {
  public container: Phaser.GameObjects.Container;
  private fill: Phaser.GameObjects.Rectangle;
  private readonly maxSize: number; // width tối đa (horizontal) hoặc height tối đa (vertical) của fill
  private readonly vertical: boolean;
  private readonly trackW: number;
  private readonly trackH: number;
  private currentRatio = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    options: { vertical?: boolean; trackColor?: number; fillColor?: number } = {}
  ) {
    this.vertical = options.vertical ?? false;
    this.trackW = width;
    this.trackH = height;
    this.maxSize = (this.vertical ? height : width) - 4;
    const trackColor = options.trackColor ?? 0x1f2937;
    const fillColor = options.fillColor ?? 0x4ade80;

    const track = scene.add.rectangle(0, 0, width, height, trackColor).setStrokeStyle(1, 0x374151);
    this.fill = scene.add.rectangle(0, 0, 1, 1, fillColor);
    this.applyFillGeometry(0);

    this.container = scene.add.container(x, y, [track, this.fill]);
  }

  /** Đặt lại CẢ size lẫn vị trí fill cho khớp ratio — gọi trực tiếp (setProgress animate=false) hoặc mỗi frame tween (onUpdate). */
  private applyFillGeometry(ratio: number): void {
    const size = Math.max(0.001, Phaser.Math.Clamp(ratio, 0, 1) * this.maxSize);
    if (this.vertical) {
      this.fill.setSize(this.trackW - 4, size);
      // Track local span [-trackH/2, trackH/2] — neo mép DƯỚI cố định, fill mọc dần lên trên khi size tăng.
      this.fill.setPosition(0, this.trackH / 2 - 2 - size / 2);
    } else {
      this.fill.setSize(size, this.trackH - 4);
      // Neo mép TRÁI cố định, fill mọc dần sang phải.
      this.fill.setPosition(-this.trackW / 2 + 2 + size / 2, 0);
    }
  }

  setProgress(ratio: number, animate = true): void {
    const clamped = Phaser.Math.Clamp(ratio, 0, 1);
    if (animate) {
      const tweenState = { value: this.currentRatio };
      this.container.scene.tweens.add({
        targets: tweenState,
        value: clamped,
        duration: 400,
        ease: "Cubic.easeOut",
        onUpdate: () => this.applyFillGeometry(tweenState.value)
      });
    } else {
      this.applyFillGeometry(clamped);
    }
    this.currentRatio = clamped;
  }

  destroy(): void {
    this.container.destroy();
  }
}
