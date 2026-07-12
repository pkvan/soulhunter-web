import Phaser from "phaser";

/**
 * Rương chiến lợi phẩm — rơi 100% tại vị trí boss CUỐI CÙNG vừa chết (xem GameScene.onBossDefeated),
 * KHÔNG tự hút theo Magnet như Soul (SoulSystem không biết tới nó), player phải chủ động đi tới va chạm
 * mới nhặt được. Chỉ 1 instance/ván (chỉ boss cuối mới trigger) nên không cần pool qua PoolManager, tồn
 * tại vĩnh viễn tới khi nhặt hoặc ván kết thúc (scene bị destroy).
 */
export class LootChest {
  public container: Phaser.GameObjects.Container;
  public active = false;
  private glow: Phaser.GameObjects.Arc;
  private box: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene) {
    // Glow vàng gold pulse liên tục phía sau để dễ nhận biết từ xa, to hơn hẳn Soul/Pickup thường.
    this.glow = scene.add.circle(0, 0, 26, 0xffd700, 0.35);
    this.box = scene.add.rectangle(0, 0, 30, 22, 0xffd700).setStrokeStyle(3, 0xb8860b);

    this.container = scene.add.container(-1000, -1000, [this.glow, this.box]);
    this.container.setDepth(6);
    this.container.setVisible(false);
  }

  spawn(x: number, y: number): void {
    this.active = true;
    this.container.setPosition(x, y);
    this.container.setVisible(true);
    this.glow.setScale(1).setAlpha(0.35);
    this.box.setScale(1);

    this.scene.tweens.killTweensOf([this.glow, this.box]);
    this.scene.tweens.add({
      targets: this.glow,
      scale: 1.6,
      alpha: 0.12,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.scene.tweens.add({
      targets: this.box,
      scale: 1.12,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  despawn(): void {
    this.active = false;
    this.scene.tweens.killTweensOf([this.glow, this.box]);
    this.container.setVisible(false);
    this.container.setPosition(-1000, -1000);
  }
}
