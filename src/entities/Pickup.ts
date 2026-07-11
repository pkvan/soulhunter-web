import Phaser from "phaser";
import { PickupDef } from "@types/index";

/**
 * Pickup ngẫu nhiên (Heal Potion / Magnet Orb, xem PickupSystem) — được PoolManager tái sử dụng.
 * Hình tròn nhấp nháy nhẹ (pulse scale liên tục) để phân biệt với Soul/Enemy trên map.
 */
export class Pickup {
  public sprite: Phaser.GameObjects.Arc;
  public def!: PickupDef;
  public active = false;
  public fading = false; // đang chạy tween fade-out chờ tự despawn — PickupSystem không check nhặt/tuổi thọ nữa
  public spawnedAt = 0;

  constructor(private scene: Phaser.Scene) {
    // TODO: thay hình tròn placeholder bằng sprite thật (icon lọ thuốc/nam châm) khi có asset
    this.sprite = scene.add.circle(-1000, -1000, 10, 0xffffff);
    this.sprite.setActive(false).setVisible(false).setDepth(5);
  }

  spawn(x: number, y: number, def: PickupDef, time: number): void {
    this.def = def;
    this.active = true;
    this.fading = false;
    this.spawnedAt = time;

    this.sprite.setPosition(x, y);
    this.sprite.setFillStyle(Number(def.color));
    this.sprite.setScale(1);
    this.sprite.setAlpha(1);
    this.sprite.setActive(true).setVisible(true);

    this.scene.tweens.killTweensOf(this.sprite); // an toàn nếu slot pool vừa despawn xong tween cũ chưa kịp dọn
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  despawn(): void {
    this.active = false;
    this.fading = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setActive(false).setVisible(false);
    this.sprite.setPosition(-1000, -1000);
  }
}
