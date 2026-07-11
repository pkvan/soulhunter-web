import Phaser from "phaser";
import { EnemyDef } from "@types/index";

/**
 * Enemy được PoolManager tái sử dụng — dùng spawn()/despawn() thay vì tạo/hủy object.
 */
export class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public def!: EnemyDef;
  public currentHp = 0;
  public active = false;
  public lastHitPlayerAt = 0;

  constructor(private scene: Phaser.Scene) {
    // TODO: texture key placeholder, đổi theo def.id khi có sprite thật
    this.sprite = scene.physics.add.sprite(-1000, -1000, "enemy_placeholder");
    this.sprite.setActive(false).setVisible(false);
  }

  spawn(x: number, y: number, def: EnemyDef, difficultyMultiplier = 1): void {
    this.def = def;
    this.currentHp = def.hp * difficultyMultiplier;
    this.sprite.setPosition(x, y);
    this.sprite.setActive(true).setVisible(true);
    this.active = true;
    this.lastHitPlayerAt = 0;
    // TODO: nếu def.flag === "phasing" (Ghost) -> tắt collision với vật cản, giữ collision với player/projectile
  }

  despawn(): void {
    this.active = false;
    this.sprite.setActive(false).setVisible(false);
    this.sprite.setVelocity(0, 0);
    this.sprite.setPosition(-1000, -1000);
  }

  takeDamage(amount: number): boolean {
    this.currentHp -= amount;
    // TODO: bắn DamageNumber, Flash effect ở đây
    return this.currentHp <= 0;
  }

  update(targetX: number, targetY: number, _delta: number): void {
    if (!this.active) return;
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, targetX, targetY);
    this.sprite.setVelocity(
      Math.cos(angle) * this.def.moveSpeed,
      Math.sin(angle) * this.def.moveSpeed
    );
  }
}
