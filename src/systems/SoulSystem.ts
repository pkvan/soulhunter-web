import Phaser from "phaser";
import { Player } from "@entities/Player";
import { GAMEPLAY } from "@config/GameConfig";
import soulCorruptionData from "@data/soulCorruption.json";
import { SoulCorruptionConfig } from "@types/index";

const soulCorruption = soulCorruptionData as SoulCorruptionConfig;

interface SoulOrb {
  sprite: Phaser.GameObjects.Arc; // TODO: thay bằng sprite thật khi có asset
  value: number;
  active: boolean;
  magnetized: boolean; // true sau khi nhặt Magnet Orb pickup — xem collectAllWithMagnet()
  magnetSpeed: number; // world units/s hiện tại, tăng dần theo thời gian (acceleration) khi magnetized
  isDark: boolean; // true = Dark Soul (Soul Corruption, GDD mục 18), chỉ rơi từ Elite Enemy
}

const MAGNET_ORB_BASE_SPEED = 150; // tốc độ khởi điểm khi vừa bị hút, mô phỏng lực hấp dẫn tăng dần chứ không phải velocity cố định
const MAGNET_ORB_ACCELERATION = 900; // world units/s^2
const MAGNET_ORB_COLLECT_RADIUS = 14;

/**
 * Quản lý Soul rơi từ quái chết, hút về player khi trong tầm Magnet (bán kính nhỏ, luôn bật) hoặc
 * khi nhặt Magnet Orb pickup (hút TOÀN BỘ Soul đang active trên map, kể cả ngoài camera). Dark Soul
 * (Soul Corruption) là 1 biến thể riêng — chỉ khác màu/kích thước/hiệu ứng nhặt, dùng chung toàn bộ
 * logic bay/magnet ở trên.
 */
export class SoulSystem {
  private orbs: SoulOrb[] = [];
  private darkSoulPickedUpThisFrame = false; // GameScene đọc + reset qua consumeDarkSoulPickup() mỗi update()

  constructor(private scene: Phaser.Scene, private player: Player) {}

  spawnSoul(x: number, y: number, value: number): void {
    // TODO: dùng object pool tương tự Enemy/Projectile nếu số lượng Soul lớn gây lag
    const sprite = this.scene.add.circle(x, y, 4, 0x8be9fd);
    this.orbs.push({ sprite, value, active: true, magnetized: false, magnetSpeed: 0, isDark: false });
  }

  /** Dark Soul (Soul Corruption) — chỉ rơi từ Elite Enemy chết, xem WeaponSystem.applyDamage(). To hơn Soul thường, có pulse glow để dễ nhận biết. */
  spawnDarkSoul(x: number, y: number, value: number): void {
    const sprite = this.scene.add.circle(x, y, 6, Number(soulCorruption.darkSoulColor));
    this.scene.tweens.add({
      targets: sprite,
      scale: 1.3,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.orbs.push({ sprite, value, active: true, magnetized: false, magnetSpeed: 0, isDark: true });
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
          this.collectOrb(orb);
        }
        continue;
      }

      const dist = Phaser.Math.Distance.Between(
        orb.sprite.x, orb.sprite.y,
        this.player.sprite.x, this.player.sprite.y
      );
      if (dist < pickupRadius) {
        this.collectOrb(orb);
      }
    }

    this.orbs = this.orbs.filter((o) => o.active);
  }

  private collectOrb(orb: SoulOrb): void {
    this.player.gainSoul(orb.value);
    if (orb.isDark) this.darkSoulPickedUpThisFrame = true;
    this.scene.tweens.killTweensOf(orb.sprite); // Dark Soul có pulse tween riêng, cần dọn trước khi destroy
    orb.sprite.destroy();
    orb.active = false;
  }

  /** GameScene gọi mỗi update() để biết có vừa nhặt Dark Soul hay không (và tự reset cờ) — kích hoạt Soul Corruption buff. */
  public consumeDarkSoulPickup(): boolean {
    const picked = this.darkSoulPickedUpThisFrame;
    this.darkSoulPickedUpThisFrame = false;
    return picked;
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
