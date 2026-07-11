import Phaser from "phaser";
import { Player } from "@entities/Player";
import { Enemy } from "@entities/Enemy";
import { PoolManager } from "@systems/PoolManager";
import { SoulSystem } from "@systems/SoulSystem";
import { showDamageNumber } from "@ui/DamageNumber";
import weaponsData from "@data/weapons.json";
import fusionWeaponsData from "@data/fusionWeapons.json";
import { WeaponDef } from "@types/index";
import { GAMEPLAY } from "@config/GameConfig";

const weapons = weaponsData as WeaponDef[];
// Vũ khí fusion không nằm trong weapons.json gốc (được tạo ra từ 2 vũ khí bị "nuốt" khi fusion,
// xem FusionSystem.applyFusion) — bảng riêng để WeaponSystem vẫn dùng chung switch theo `type`.
// Hiệu ứng đặc trưng của từng fusion (chain lightning, slow, DOT, lifesteal, AoE...) được khai báo
// bằng field phụ tùy chọn ngay trong entry đó (xem applyOnHitEffects) thay vì viết case riêng —
// tái dùng đúng cơ chế melee/projectile/random_target đã có theo yêu cầu, không thêm loại `type` mới.
const fusionWeapons = fusionWeaponsData as WeaponDef[];
const allWeaponDefs = [...weapons, ...fusionWeapons];

/**
 * Auto-attack: mỗi vũ khí đã equip tự bắn theo cooldown riêng, không cần input người chơi.
 * Tách riêng theo weapon.type để dễ thêm vũ khí fusion sau này (chỉ cần thêm case mới).
 */
export class WeaponSystem {
  private lastFiredAt: Record<string, number> = {};

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private poolManager: PoolManager,
    private soulSystem: SoulSystem,
    private onEnemyKilled: () => void
  ) {}

  update(time: number, _delta: number): void {
    for (const equipped of this.player.equippedWeapons) {
      const def = allWeaponDefs.find((w) => w.id === equipped.weaponId);
      if (!def) continue;

      const cooldown = def.baseCooldownMs * this.player.stats.cooldownMultiplier;
      const last = this.lastFiredAt[def.id] ?? 0;
      if (time - last >= cooldown) {
        this.fire(def, equipped.level, time);
        this.lastFiredAt[def.id] = time;
      }
    }

    this.updateProjectiles(time);
    this.updateDotTicks(time);
  }

  private fire(def: WeaponDef, level: number, time: number): void {
    const damage = def.baseDamage * (1 + (level - 1) * 0.1) * this.player.stats.damageMultiplier;

    switch (def.type) {
      case "melee": {
        // MVP: quét vòng tròn quanh player trong def.baseRange thay vì vòng cung có hướng
        const range = (def.baseRange as number) ?? 60;
        const slashColor = def.slashColor !== undefined ? Number(def.slashColor) : 0xf5f5f5;
        this.drawSwordSlash(range, slashColor);

        const hitEnemies: Enemy[] = [];
        for (const enemy of this.poolManager.getAllActiveEnemies()) {
          const dist = Phaser.Math.Distance.Between(
            this.player.sprite.x, this.player.sprite.y,
            enemy.sprite.x, enemy.sprite.y
          );
          if (dist > range) continue;

          this.applyDamage(enemy, damage);
          hitEnemies.push(enemy);
        }
        for (const enemy of hitEnemies) {
          this.applyOnHitEffects(enemy, def, damage, time, hitEnemies);
        }
        break;
      }
      case "projectile_straight":
      case "projectile_pierce":
      case "projectile_return": {
        const target = this.findNearestEnemy();
        if (!target) break;
        const projectile = this.poolManager.getProjectile();
        if (!projectile) break;
        const angle = Phaser.Math.Angle.Between(
          this.player.sprite.x, this.player.sprite.y,
          target.sprite.x, target.sprite.y
        );
        projectile.fire(this.player.sprite.x, this.player.sprite.y, angle, def, damage);
        break;
      }
      case "random_target": {
        const enemies = this.poolManager.getAllActiveEnemies();
        if (enemies.length === 0) break;

        const target = Phaser.Utils.Array.GetRandom(enemies);
        this.applyDamage(target, damage);
        this.drawLightningEffect(target.sprite.x, target.sprite.y);
        this.applyOnHitEffects(target, def, damage, time, [target]);
        break;
      }
    }
  }

  /** Duyệt projectile đang active mỗi frame: di chuyển (return/despawn) + kiểm tra va chạm enemy. */
  private updateProjectiles(time: number): void {
    for (const projectile of this.poolManager.getAllActiveProjectiles()) {
      projectile.update(this.player.sprite.x, this.player.sprite.y);
      if (!projectile.active) continue;

      for (const enemy of this.poolManager.getAllActiveEnemies()) {
        if (projectile.hasHit(enemy)) continue;

        const dist = Phaser.Math.Distance.Between(
          projectile.sprite.x, projectile.sprite.y,
          enemy.sprite.x, enemy.sprite.y
        );
        if (dist > GAMEPLAY.PROJECTILE_HIT_RADIUS) continue;

        this.applyDamage(enemy, projectile.damage);
        const def = allWeaponDefs.find((w) => w.id === projectile.weaponId);
        if (def) this.applyOnHitEffects(enemy, def, projectile.damage, time, [enemy], projectile.sprite.x, projectile.sprite.y);
        projectile.registerHit(enemy);

        if (!projectile.active) break; // projectile đã despawn (nổ / hết pierce) -> dừng kiểm tra enemy khác
      }
    }
  }

  /**
   * Hiệu ứng phụ khi trúng đòn — chỉ áp dụng cho vũ khí fusion có khai báo field tương ứng trong
   * fusionWeapons.json. `excludeFromChain` là danh sách enemy đã bị đòn chính gây damage, dùng để
   * chain/random-chain không zap trùng lại chính nó hoặc double-count trong 1 lần bắn.
   * Chain/AoE dùng applyDamage thuần (không gọi lại applyOnHitEffects) để tránh hiệu ứng đệ quy.
   */
  private applyOnHitEffects(
    enemy: Enemy,
    def: WeaponDef,
    damage: number,
    time: number,
    excludeFromChain: Enemy[],
    hitX = enemy.sprite.x,
    hitY = enemy.sprite.y
  ): void {
    const slowChance = (def.slowChance as number) ?? 1;
    if (def.slowFactor !== undefined && Phaser.Math.FloatBetween(0, 1) <= slowChance) {
      enemy.applySlow(def.slowFactor as number, (def.slowDurationMs as number) ?? 1500, time);
    }

    if (def.dotDamage !== undefined) {
      enemy.applyDot(
        def.dotDamage as number,
        (def.dotDurationMs as number) ?? 2500,
        (def.dotTickIntervalMs as number) ?? 500,
        time
      );
    }

    if (def.lifeStealPercent !== undefined) {
      this.player.heal(damage * (def.lifeStealPercent as number));
    }

    if (def.chainRadius !== undefined) {
      const chainTarget = this.findNearestEnemyExcluding(enemy.sprite.x, enemy.sprite.y, def.chainRadius as number, excludeFromChain);
      if (chainTarget) {
        const chainDamage = damage * ((def.chainDamageRatio as number) ?? 0.5);
        this.applyDamage(chainTarget, chainDamage);
        this.drawLightningEffect(chainTarget.sprite.x, chainTarget.sprite.y, enemy.sprite.x, enemy.sprite.y);
      }
    }

    if (def.randomChainCount !== undefined) {
      const pool = this.poolManager.getAllActiveEnemies().filter((e) => !excludeFromChain.includes(e));
      const count = Math.min(def.randomChainCount as number, pool.length);
      const targets = Phaser.Utils.Array.Shuffle(pool).slice(0, count);
      for (const t of targets) {
        const chainDamage = damage * ((def.randomChainDamageRatio as number) ?? 0.5);
        this.applyDamage(t, chainDamage);
        this.drawLightningEffect(t.sprite.x, t.sprite.y);
      }
    }

    if (def.aoeRadius !== undefined) {
      for (const other of this.poolManager.getAllActiveEnemies()) {
        if (other === enemy) continue;
        const dist = Phaser.Math.Distance.Between(hitX, hitY, other.sprite.x, other.sprite.y);
        if (dist > (def.aoeRadius as number)) continue;
        other.applySlow((def.aoeSlowFactor as number) ?? 0.6, (def.aoeSlowDurationMs as number) ?? 1500, time);
      }
    }
  }

  /** Tick damage-over-time (poison/burn) mỗi frame — dùng applyDamage thuần, không kích hoạt lại on-hit effect. */
  private updateDotTicks(time: number): void {
    for (const enemy of this.poolManager.getAllActiveEnemies()) {
      if (time >= enemy.dotUntil) continue;
      if (time < enemy.nextDotTickAt) continue;

      this.applyDamage(enemy, enemy.dotDamage);
      enemy.nextDotTickAt = time + enemy.dotTickIntervalMs;
    }
  }

  /** Gây damage, hiện damage number, và xử lý chết (soul + despawn + kill count) — dùng chung cho mọi loại vũ khí. */
  private applyDamage(enemy: Enemy, damage: number): void {
    const isDead = enemy.takeDamage(damage);
    showDamageNumber(this.scene, enemy.sprite.x, enemy.sprite.y, damage);

    if (isDead) {
      this.soulSystem.spawnSoul(enemy.sprite.x, enemy.sprite.y, enemy.def.soulValue);
      enemy.despawn();
      this.onEnemyKilled();
    }
  }

  /** Vòng tròn lóe lên tại bán kính đánh melee, fade out sau ~150ms. Màu mặc định trắng/bạc (Sword), vũ khí fusion melee dùng màu riêng. */
  private drawSwordSlash(range: number, color = 0xf5f5f5): void {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, color, 0.9);
    graphics.strokeCircle(this.player.sprite.x, this.player.sprite.y, range);

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 150,
      onComplete: () => graphics.destroy()
    });
  }

  /** Tia sét: mặc định từ player tới target (Lightning gốc), hoặc từ 1 điểm bất kỳ nếu truyền fromX/fromY (chain). */
  private drawLightningEffect(targetX: number, targetY: number, fromX?: number, fromY?: number): void {
    const line = this.scene.add.line(
      0, 0,
      fromX ?? this.player.sprite.x, fromY ?? this.player.sprite.y,
      targetX, targetY,
      0xfff9b0 // vàng-trắng sáng, dễ thấy hơn
    ).setOrigin(0, 0).setLineWidth(4);

    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 150,
      onComplete: () => line.destroy()
    });
  }

  private findNearestEnemy(): Enemy | null {
    return this.findNearestEnemyExcluding(this.player.sprite.x, this.player.sprite.y, Infinity, []);
  }

  private findNearestEnemyExcluding(x: number, y: number, maxDist: number, exclude: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;
    for (const e of this.poolManager.getAllActiveEnemies()) {
      if (exclude.includes(e)) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y);
      if (d < nearestDist && d <= maxDist) {
        nearestDist = d;
        nearest = e;
      }
    }
    return nearest;
  }
}
