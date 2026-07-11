import Phaser from "phaser";
import { Enemy } from "@entities/Enemy";
import { Projectile } from "@entities/Projectile";

/**
 * QUAN TRỌNG: mọi Enemy/Projectile phải đi qua PoolManager, không new trực tiếp trong SpawnSystem/WeaponSystem.
 * Roguelite kiểu này có thể có 200+ enemy và 100+ projectile cùng lúc trên màn hình — không pool sẽ lag nặng
 * do garbage collection liên tục. Xem CLAUDE.md mục "Quy ước code".
 */
export class PoolManager {
  private enemyPool: Enemy[] = [];
  private projectilePool: Projectile[] = [];
  private readonly ENEMY_POOL_SIZE = 200;
  private readonly PROJECTILE_POOL_SIZE = 150;

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < this.ENEMY_POOL_SIZE; i++) {
      this.enemyPool.push(new Enemy(scene));
    }
    for (let i = 0; i < this.PROJECTILE_POOL_SIZE; i++) {
      this.projectilePool.push(new Projectile(scene));
    }
  }

  getEnemy(): Enemy | null {
    return this.enemyPool.find((e) => !e.active) ?? null;
    // TODO: nếu thường xuyên trả về null nghĩa là pool quá nhỏ hoặc despawn không được gọi đúng lúc -> kiểm tra lại
  }

  getProjectile(): Projectile | null {
    return this.projectilePool.find((p) => !p.active) ?? null;
  }

  getAllActiveEnemies(): Enemy[] {
    return this.enemyPool.filter((e) => e.active);
  }

  getAllActiveProjectiles(): Projectile[] {
    return this.projectilePool.filter((p) => p.active);
  }
}
