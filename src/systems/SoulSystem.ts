import Phaser from "phaser";
import { Player } from "@entities/Player";
import { GAMEPLAY } from "@config/GameConfig";

interface SoulOrb {
  sprite: Phaser.GameObjects.Arc; // TODO: thay bằng sprite thật khi có asset
  value: number;
  active: boolean;
}

/**
 * Quản lý Soul rơi từ quái chết, hút về player khi trong tầm Magnet.
 */
export class SoulSystem {
  private orbs: SoulOrb[] = [];

  constructor(private scene: Phaser.Scene, private player: Player) {}

  spawnSoul(x: number, y: number, value: number): void {
    // TODO: dùng object pool tương tự Enemy/Projectile nếu số lượng Soul lớn gây lag
    const sprite = this.scene.add.circle(x, y, 4, 0x8be9fd);
    this.orbs.push({ sprite, value, active: true });
  }

  update(_delta: number): void {
    const pickupRadius = GAMEPLAY.MAGNET_BASE_RADIUS * this.player.stats.pickupRadiusMultiplier;

    for (const orb of this.orbs) {
      if (!orb.active) continue;
      const dist = Phaser.Math.Distance.Between(
        orb.sprite.x, orb.sprite.y,
        this.player.sprite.x, this.player.sprite.y
      );

      if (dist < pickupRadius) {
        // TODO: tween orb bay về player thay vì teleport, cho cảm giác "hút" mượt hơn
        this.player.gainSoul(orb.value);
        orb.sprite.destroy();
        orb.active = false;
      }
    }

    this.orbs = this.orbs.filter((o) => o.active);
  }
}
