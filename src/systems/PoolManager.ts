import Phaser from "phaser";
import { Enemy } from "@entities/Enemy";
import { Projectile } from "@entities/Projectile";
import { Pickup } from "@entities/Pickup";

/**
 * QUAN TRỌNG: mọi Enemy/Projectile phải đi qua PoolManager, không new trực tiếp trong SpawnSystem/WeaponSystem.
 * Roguelite kiểu này có thể có 200+ enemy và 100+ projectile cùng lúc trên màn hình — không pool sẽ lag nặng
 * do garbage collection liên tục. Xem CLAUDE.md mục "Quy ước code".
 */
export class PoolManager {
  private enemyPool: Enemy[] = [];
  private projectilePool: Projectile[] = [];
  private pickupPool: Pickup[] = [];
  private readonly ENEMY_POOL_SIZE = 200;
  private readonly PROJECTILE_POOL_SIZE = 150;
  private readonly PICKUP_POOL_SIZE = 5; // thực tế thường chỉ 1 pickup active cùng lúc, 5 slot đủ dư

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < this.ENEMY_POOL_SIZE; i++) {
      this.enemyPool.push(new Enemy(scene));
    }
    for (let i = 0; i < this.PROJECTILE_POOL_SIZE; i++) {
      this.projectilePool.push(new Projectile(scene));
    }
    for (let i = 0; i < this.PICKUP_POOL_SIZE; i++) {
      this.pickupPool.push(new Pickup(scene));
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

  /** Toàn bộ sprite Enemy trong pool (kể cả đang inactive nằm ở (-1000,-1000)) — dùng để đăng ký collider Wall 1 lần duy nhất. */
  getAllEnemySprites(): Phaser.Physics.Arcade.Sprite[] {
    return this.enemyPool.map((e) => e.sprite);
  }

  getAllActiveProjectiles(): Projectile[] {
    return this.projectilePool.filter((p) => p.active);
  }

  getPickup(): Pickup | null {
    return this.pickupPool.find((p) => !p.active) ?? null;
  }

  getAllActivePickups(): Pickup[] {
    return this.pickupPool.filter((p) => p.active);
  }
}
