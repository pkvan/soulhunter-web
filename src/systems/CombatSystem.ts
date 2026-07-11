import Phaser from "phaser";
import { Player } from "@entities/Player";
import { PoolManager } from "@systems/PoolManager";
import { GAMEPLAY } from "@config/GameConfig";

/**
 * Di chuyển enemy về phía player và xử lý va chạm gây damage lên player (dùng def.damage trong enemies.json).
 * Mỗi enemy có cooldown riêng để không trừ HP mỗi frame khi đứng dính vào player.
 */
export class CombatSystem {
  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private poolManager: PoolManager
  ) {}

  update(time: number, delta: number): void {
    for (const enemy of this.poolManager.getAllActiveEnemies()) {
      enemy.update(this.player.sprite.x, this.player.sprite.y, time, delta);

      const dist = Phaser.Math.Distance.Between(
        enemy.sprite.x, enemy.sprite.y,
        this.player.sprite.x, this.player.sprite.y
      );

      if (
        dist <= GAMEPLAY.ENEMY_PLAYER_COLLISION_RADIUS &&
        time - enemy.lastHitPlayerAt >= GAMEPLAY.ENEMY_HIT_COOLDOWN_MS
      ) {
        enemy.lastHitPlayerAt = time;
        this.player.takeDamage(enemy.getCurrentDamage(time)); // tính cả buff Roar từ Boss (nếu đang active)
      }
    }
  }
}
