import Phaser from "phaser";
import { Player } from "@entities/Player";
import { Enemy } from "@entities/Enemy";
import { Boss } from "@entities/Boss";
import { PoolManager } from "@systems/PoolManager";
import { SoulSystem } from "@systems/SoulSystem";
import { BossSystem } from "@systems/BossSystem";
import { showDamageNumber } from "@ui/DamageNumber";
import { Projectile } from "@entities/Projectile";
import weaponsData from "@data/weapons.json";
import fusionWeaponsData from "@data/fusionWeapons.json";
import soulCorruptionData from "@data/soulCorruption.json";
import upgradesData from "@data/upgrades.json";
import { WeaponDef, SoulCorruptionConfig, UpgradeDef } from "@types/index";
import { GAMEPLAY } from "@config/GameConfig";

const soulCorruption = soulCorruptionData as SoulCorruptionConfig;
const upgrades = upgradesData as UpgradeDef[];
const shrapnelDef = upgrades.find((u) => u.id === "shrapnel");
// appliesTo có thể là string đơn hoặc mảng (vd Shrapnel áp cho cả Fireball/Ice Shard) — chuẩn hóa về mảng 1 lần khi module load.
const shrapnelAppliesTo: string[] = Array.isArray(shrapnelDef?.appliesTo)
  ? (shrapnelDef!.appliesTo as string[])
  : shrapnelDef?.appliesTo
    ? [shrapnelDef.appliesTo as string]
    : [];

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
    private bossSystem: BossSystem,
    private onEnemyKilled: (isElite: boolean) => void
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

          const dodgeChance = enemy.def.meleeDodgeChance ?? 0;
          if (dodgeChance > 0 && Phaser.Math.FloatBetween(0, 1) < dodgeChance) continue; // né đòn melee (vd Ghost)

          this.applyDamage(enemy, damage);
          hitEnemies.push(enemy);
        }
        for (const enemy of hitEnemies) {
          this.applyOnHitEffects(enemy, def, damage, time, hitEnemies);
        }

        const boss = this.bossSystem.getBoss();
        if (boss) {
          const distBoss = Phaser.Math.Distance.Between(
            this.player.sprite.x, this.player.sprite.y,
            boss.sprite.x, boss.sprite.y
          );
          if (distBoss <= range) this.applyDamageToBoss(boss, damage);
        }
        break;
      }
      case "projectile_straight":
      case "projectile_pierce":
      case "projectile_return": {
        const target = this.findNearestTarget();
        if (!target) break;
        const projectile = this.poolManager.getProjectile();
        if (!projectile) break;
        const angle = Phaser.Math.Angle.Between(
          this.player.sprite.x, this.player.sprite.y,
          target.x, target.y
        );
        projectile.fire(this.player.sprite.x, this.player.sprite.y, angle, def, damage);
        break;
      }
      case "random_target": {
        const boss = this.bossSystem.getBoss();
        const pool: Array<Enemy | Boss> = boss
          ? [...this.poolManager.getAllActiveEnemies(), boss]
          : this.poolManager.getAllActiveEnemies();
        if (pool.length === 0) break;

        const target = Phaser.Utils.Array.GetRandom(pool);
        this.drawLightningEffect(target.sprite.x, target.sprite.y);
        if (target instanceof Boss) {
          this.applyDamageToBoss(target, damage); // chưa áp on-hit effect (chain/dot/slow) lên boss ở MVP
        } else {
          this.applyDamage(target, damage);
          this.applyOnHitEffects(target, def, damage, time, [target]);
        }
        break;
      }
    }
  }

  /** Duyệt projectile đang active mỗi frame: di chuyển (return/despawn) + kiểm tra va chạm enemy/boss. */
  private updateProjectiles(time: number): void {
    const boss = this.bossSystem.getBoss();

    for (const projectile of this.poolManager.getAllActiveProjectiles()) {
      projectile.update(this.player.sprite.x, this.player.sprite.y);
      if (!projectile.active) continue;

      if (boss && !projectile.hasHit(boss)) {
        const distBoss = Phaser.Math.Distance.Between(
          projectile.sprite.x, projectile.sprite.y,
          boss.sprite.x, boss.sprite.y
        );
        if (distBoss <= GAMEPLAY.PROJECTILE_HIT_RADIUS) {
          this.applyDamageToBoss(boss, projectile.damage);
          projectile.registerHit(boss);
        }
      }
      if (!projectile.active) continue; // có thể đã despawn (straight/pierce) ngay sau khi trúng boss

      for (const enemy of this.poolManager.getAllActiveEnemies()) {
        if (projectile.hasHit(enemy)) continue;

        const dist = Phaser.Math.Distance.Between(
          projectile.sprite.x, projectile.sprite.y,
          enemy.sprite.x, enemy.sprite.y
        );
        if (dist > GAMEPLAY.PROJECTILE_HIT_RADIUS) continue;

        this.applyDamage(enemy, projectile.damage);
        const def = allWeaponDefs.find((w) => w.id === projectile.weaponId);
        if (def) this.applyOnHitEffects(enemy, def, projectile.damage, time, [enemy], projectile.sprite.x, projectile.sprite.y, projectile);
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
    hitY = enemy.sprite.y,
    sourceProjectile?: Projectile
  ): void {
    const slowChance = (def.slowChance as number) ?? 1;
    if (def.slowFactor !== undefined && Phaser.Math.FloatBetween(0, 1) <= slowChance) {
      enemy.applySlow(def.slowFactor as number, (def.slowDurationMs as number) ?? 1500, time);
    }

    // Freeze Chance (upgrade riêng biệt với slow baseline của Ice Shard ở trên): % đóng băng HẲN (factor 1)
    // thay vì chỉ làm chậm — ghi đè slow baseline vì gọi applySlow() lần 2 ngay sau đó trong cùng lượt trúng đòn.
    if (def.id === "ice_shard") {
      const freezeChance = this.player.stats.freezeChance ?? 0;
      if (freezeChance > 0 && Phaser.Math.FloatBetween(0, 1) < freezeChance) {
        enemy.applySlow(1, GAMEPLAY.ICE_SHARD_FREEZE_DURATION_MS, time);
      }
    }

    if (def.dotDamage !== undefined || def.dotDamageRatio !== undefined) {
      // Burn upgrade (id "burn"): cộng thêm % damage/giây vào tỉ lệ DOT gốc của Fireball, không tạo hiệu ứng riêng.
      const burnBonusRatio = def.id === "fireball" ? (this.player.stats.burnChance ?? 0) : 0;
      const dotDamage = def.dotDamageRatio !== undefined
        ? damage * ((def.dotDamageRatio as number) + burnBonusRatio)
        : (def.dotDamage as number);
      enemy.applyDot(
        dotDamage,
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

    // Shrapnel (upgrade stackable, chỉ Fireball/Ice Shard theo appliesTo trong upgrades.json): bắn thêm N tia phụ
    // dàn đều quanh 1 góc ngẫu nhiên khi trúng quái, damage giảm 50%. Chặn đệ quy bằng cờ isShrapnel trên Projectile
    // gốc — tia phụ trúng KHÔNG tự bắn thêm tia phụ nữa.
    const shrapnelCount = this.player.stats.shrapnelCount ?? 0;
    if (shrapnelCount > 0 && !sourceProjectile?.isShrapnel && shrapnelAppliesTo.includes(def.id)) {
      this.spawnShrapnel(hitX, hitY, def, damage * 0.5, shrapnelCount + 1);
    }
  }

  /** count tia phụ dàn đều 360° quanh 1 góc gốc ngẫu nhiên, dùng chung Projectile pool với cờ isShrapnel=true. */
  private spawnShrapnel(x: number, y: number, def: WeaponDef, damage: number, count: number): void {
    const baseAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    for (let i = 0; i < count; i++) {
      const projectile = this.poolManager.getProjectile();
      if (!projectile) break;
      const angle = baseAngle + (Math.PI * 2 * i) / count;
      projectile.fire(x, y, angle, def, damage, true);
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

  /** Gây damage, hiện damage number, và xử lý chết (soul/Dark Soul + despawn + kill count) — dùng chung cho mọi loại vũ khí. */
  private applyDamage(enemy: Enemy, damage: number): void {
    const isDead = enemy.takeDamage(damage);
    showDamageNumber(this.scene, enemy.sprite.x, enemy.sprite.y, damage);

    if (isDead) {
      const isElite = enemy.isElite;
      // Elite Enemy (GDD mục 18): % rơi Dark Soul thay vì Soul thường, luôn thưởng thêm Coin (bonusCoinFromElites, xem GameScene.registerKill).
      if (isElite && Phaser.Math.FloatBetween(0, 1) < soulCorruption.darkSoulDropChance) {
        this.soulSystem.spawnDarkSoul(enemy.sprite.x, enemy.sprite.y, enemy.def.soulValue * soulCorruption.darkSoulValueMultiplier);
      } else {
        this.soulSystem.spawnSoul(enemy.sprite.x, enemy.sprite.y, enemy.def.soulValue);
      }
      enemy.despawn();
      this.onEnemyKilled(isElite);
    }
  }

  /** Boss không đi qua PoolManager (chỉ 1 instance) nên tách riêng khỏi applyDamage — BossSystem tự xử lý chết/BOSS_DEFEATED. */
  private applyDamageToBoss(boss: Boss, damage: number): void {
    showDamageNumber(this.scene, boss.sprite.x, boss.sprite.y, damage);
    this.bossSystem.applyDamageToBoss(damage);
  }

  /** Vòng tròn lóe lên tại bán kính đánh melee, fade out sau ~150ms. Màu mặc định trắng/bạc (Sword), vũ khí fusion melee dùng màu riêng. */
  private drawSwordSlash(range: number, color = 0xf5f5f5): void {
    const graphics = this.scene.add.graphics();
    // Vẽ lại theo vị trí player MỖI FRAME suốt lúc hiệu ứng còn hiển thị (onUpdate) — nếu chỉ vẽ 1 lần lúc tạo,
    // vòng đánh sẽ bị lệch khỏi player khi player di chuyển trong 150ms hiệu ứng đang fade.
    const redraw = () => {
      graphics.clear();
      graphics.lineStyle(3, color, 0.9);
      graphics.strokeCircle(this.player.sprite.x, this.player.sprite.y, range);
    };
    redraw();

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 150,
      onUpdate: redraw,
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

  /** Mục tiêu cho projectile: enemy gần nhất hoặc boss, tùy cái nào gần player hơn (dùng để hướng bắn). */
  private findNearestTarget(): { x: number; y: number } | null {
    const nearestEnemy = this.findNearestEnemy();
    const boss = this.bossSystem.getBoss();
    if (!boss) return nearestEnemy?.sprite ?? null;
    if (!nearestEnemy) return boss.sprite;

    const dEnemy = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, nearestEnemy.sprite.x, nearestEnemy.sprite.y);
    const dBoss = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, boss.sprite.x, boss.sprite.y);
    return dBoss < dEnemy ? boss.sprite : nearestEnemy.sprite;
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
