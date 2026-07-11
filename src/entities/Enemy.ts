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

  // Status effect đơn giản dùng chung cho các vũ khí fusion (slow/stun + damage-over-time) —
  // xem WeaponSystem.applyStatusEffects(). Không track riêng "poison"/"burn"/"freeze" vì cơ chế
  // giống hệt nhau (1 factor làm chậm di chuyển, 1 tick damage theo thời gian), chỉ khác flavor text.
  public slowFactor = 0;
  public slowUntil = 0;
  public dotDamage = 0;
  public dotTickIntervalMs = 0;
  public dotUntil = 0;
  public nextDotTickAt = 0;

  // Buff tạm thời từ Boss Roar (xem BossSystem.applyRoarBuff) — dùng chung 1 durationMs cho cả 2 stat.
  public speedBuffMultiplier = 1;
  public damageBuffMultiplier = 1;
  public buffUntil = 0;

  // Lệch pha ngẫu nhiên cho di chuyển zigzag (vd Bat) để nhiều con cùng loại không lắc đồng bộ — xem update().
  private zigzagPhase = 0;

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
    this.slowFactor = 0;
    this.slowUntil = 0;
    this.dotDamage = 0;
    this.dotTickIntervalMs = 0;
    this.dotUntil = 0;
    this.nextDotTickAt = 0;
    this.speedBuffMultiplier = 1;
    this.damageBuffMultiplier = 1;
    this.buffUntil = 0;
    this.zigzagPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);

    // Placeholder màu theo loại quái (xem enemies.json) — texture enemy_placeholder là trắng thuần nên tint ra đúng màu.
    if (def.tintColor !== undefined) this.sprite.setTint(Number(def.tintColor));
    else this.sprite.clearTint();
    this.sprite.setAlpha(def.alpha ?? 1);
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

  /** Gắn hiệu ứng làm chậm/stun (factor=1 = đứng im hẳn), dùng chung cho slow/freeze/stun. */
  applySlow(factor: number, durationMs: number, time: number): void {
    this.slowFactor = factor;
    this.slowUntil = time + durationMs;
  }

  /** Gắn damage-over-time, dùng chung cho poison/burn. Reset lại thời lượng nếu bị trúng thêm lần nữa. */
  applyDot(damage: number, durationMs: number, tickIntervalMs: number, time: number): void {
    this.dotDamage = damage;
    this.dotTickIntervalMs = tickIntervalMs;
    this.dotUntil = time + durationMs;
    this.nextDotTickAt = time + tickIntervalMs;
  }

  /** Gắn buff tạm thời từ Boss Roar — speedMultiplier/damageMultiplier vd 1.3 = +30%. */
  applyBuff(speedMultiplier: number, damageMultiplier: number, durationMs: number, time: number): void {
    this.speedBuffMultiplier = speedMultiplier;
    this.damageBuffMultiplier = damageMultiplier;
    this.buffUntil = time + durationMs;
  }

  /** Damage va chạm hiện tại (đã tính buff Roar nếu đang active) — CombatSystem dùng thay vì đọc def.damage trực tiếp. */
  getCurrentDamage(time: number): number {
    return this.def.damage * (time < this.buffUntil ? this.damageBuffMultiplier : 1);
  }

  update(targetX: number, targetY: number, time: number, _delta: number): void {
    if (!this.active) return;
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, targetX, targetY);
    const slowMultiplier = time < this.slowUntil ? 1 - this.slowFactor : 1;
    const buffMultiplier = time < this.buffUntil ? this.speedBuffMultiplier : 1;
    const speed = this.def.moveSpeed * slowMultiplier * buffMultiplier;

    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;

    if (this.def.movementPattern === "zigzag") {
      // Lắc theo trục vuông góc với hướng chính tới player bằng sin wave — không đổi tốc độ tiến thẳng,
      // chỉ cộng thêm dao động ngang để tạo đường bay ngoằn ngoèo (vd Bat).
      const perpAngle = angle + Math.PI / 2;
      const wave = Math.sin(time / 150 + this.zigzagPhase) * speed * 0.6;
      vx += Math.cos(perpAngle) * wave;
      vy += Math.sin(perpAngle) * wave;
    }

    this.sprite.setVelocity(vx, vy);
  }
}
