import Phaser from "phaser";
import { Player } from "@entities/Player";
import { GAMEPLAY } from "@config/GameConfig";

interface SoulOrb {
  sprite: Phaser.GameObjects.Arc; // TODO: thay bằng sprite thật khi có asset
  value: number;
  active: boolean;
  magnetized: boolean; // true sau khi nhặt Magnet Orb pickup — xem collectAllWithMagnet()
  magnetSpeed: number; // world units/s hiện tại, tăng dần theo thời gian (acceleration) khi magnetized
}

const MAGNET_ORB_BASE_SPEED = 150; // tốc độ khởi điểm khi vừa bị hút, mô phỏng lực hấp dẫn tăng dần chứ không phải velocity cố định
const MAGNET_ORB_ACCELERATION = 900; // world units/s^2
const MAGNET_ORB_COLLECT_RADIUS = 14;

/**
 * Quản lý Soul rơi từ quái chết, hút về player khi trong tầm Magnet (bán kính nhỏ, luôn bật) hoặc
 * khi nhặt Magnet Orb pickup (hút TOÀN BỘ Soul đang active trên map, kể cả ngoài camera).
 */
export class SoulSystem {
  private orbs: SoulOrb[] = [];

  constructor(private scene: Phaser.Scene, private player: Player) {}

  spawnSoul(x: number, y: number, value: number): void {
    // TODO: dùng object pool tương tự Enemy/Projectile nếu số lượng Soul lớn gây lag
    const sprite = this.scene.add.circle(x, y, 4, 0x8be9fd);
    this.orbs.push({ sprite, value, active: true, magnetized: false, magnetSpeed: 0 });
  }

  update(delta: number): void {
    const pickupRadius = GAMEPLAY.MAGNET_BASE_RADIUS * this.player.stats.pickupRadiusMultiplier;
    const deltaSec = delta / 1000;

    for (const orb of this.orbs) {
      if (!orb.active) continue;

      if (orb.magnetized) {
        // Mỗi frame tính lại hướng bay theo vị trí HIỆN TẠI của player (không phải điểm cố định lúc kích
        // hoạt) để Soul đuổi theo player nếu đang di chuyển. Tốc độ tăng dần theo gia tốc, không phải
        // velocity đều, tạo cảm giác lực hút thay vì bay thẳng đường cứng.
        orb.magnetSpeed += MAGNET_ORB_ACCELERATION * deltaSec;
        const angle = Phaser.Math.Angle.Between(orb.sprite.x, orb.sprite.y, this.player.sprite.x, this.player.sprite.y);
        const step = orb.magnetSpeed * deltaSec;
        orb.sprite.x += Math.cos(angle) * step;
        orb.sprite.y += Math.sin(angle) * step;

        const dist = Phaser.Math.Distance.Between(orb.sprite.x, orb.sprite.y, this.player.sprite.x, this.player.sprite.y);
        if (dist < MAGNET_ORB_COLLECT_RADIUS) {
          this.player.gainSoul(orb.value);
          orb.sprite.destroy();
          orb.active = false;
        }
        continue;
      }

      const dist = Phaser.Math.Distance.Between(
        orb.sprite.x, orb.sprite.y,
        this.player.sprite.x, this.player.sprite.y
      );
      if (dist < pickupRadius) {
        this.player.gainSoul(orb.value);
        orb.sprite.destroy();
        orb.active = false;
      }
    }

    this.orbs = this.orbs.filter((o) => o.active);
  }

  /**
   * Magnet Orb pickup: TOÀN BỘ Soul đang active trên map (không lọc theo khoảng cách/camera — kể cả
   * đang ở rất xa ngoài tầm nhìn) bắt đầu bay hội tụ về player CÙNG LÚC. Khoảng cách khác nhau nên tự
   * nhiên tới player ở thời điểm khác nhau, tạo hiệu ứng hội tụ từ mọi hướng thay vì bay tuần tự.
   * Xử lý đuổi theo + tăng tốc nằm ở update() (magnetized branch), không dùng tween tới điểm cố định
   * vì player có thể di chuyển tiếp trong lúc Soul đang bay.
   */
  public collectAllWithMagnet(pingColor = 0x60f0e0): void {
    for (const orb of this.orbs) {
      if (!orb.active) continue;
      orb.magnetized = true;
      orb.magnetSpeed = MAGNET_ORB_BASE_SPEED;
    }
    this.showMagnetPing(pingColor);
  }

  /** Vòng tròn expand rồi fade tại vị trí player lúc kích hoạt Magnet Orb — báo hiệu rõ hiệu ứng vừa bật. */
  private showMagnetPing(color: number): void {
    const ping = this.scene.add.circle(this.player.sprite.x, this.player.sprite.y, 10, color, 0.35)
      .setStrokeStyle(2, color, 0.9)
      .setDepth(4);

    this.scene.tweens.add({
      targets: ping,
      radius: 90,
      alpha: 0,
      duration: 500,
      ease: "Cubic.easeOut",
      onComplete: () => ping.destroy()
    });
  }
}
