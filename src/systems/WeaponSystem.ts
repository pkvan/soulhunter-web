import Phaser from "phaser";
import { Player } from "@entities/Player";
import { Enemy } from "@entities/Enemy";
import { PoolManager } from "@systems/PoolManager";
import { SoulSystem } from "@systems/SoulSystem";
import { showDamageNumber } from "@ui/DamageNumber";
import weaponsData from "@data/weapons.json";
import { WeaponDef } from "@types/index";
import { GAMEPLAY } from "@config/GameConfig";

const weapons = weaponsData as WeaponDef[];

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
      const def = weapons.find((w) => w.id === equipped.weaponId);
      if (!def) continue; // có thể là vũ khí fusion, chưa có trong weapons.json gốc -> TODO tách bảng fusion weapon riêng

      const cooldown = def.baseCooldownMs * this.player.stats.cooldownMultiplier;
      const last = this.lastFiredAt[def.id] ?? 0;
      if (time - last >= cooldown) {
        this.fire(def, equipped.level);
        this.lastFiredAt[def.id] = time;
      }
    }

    this.updateProjectiles();
  }

  private fire(def: WeaponDef, level: number): void {
    const damage = def.baseDamage * (1 + (level - 1) * 0.1) * this.player.stats.damageMultiplier;

    switch (def.type) {
      case "melee": {
        // MVP: quét vòng tròn quanh player trong def.baseRange thay vì vòng cung có hướng
        const range = (def.baseRange as number) ?? 60;
        this.drawSwordSlash(range);

        const enemies = this.poolManager.getAllActiveEnemies();
        for (const enemy of enemies) {
          const dist = Phaser.Math.Distance.Between(
            this.player.sprite.x, this.player.sprite.y,
            enemy.sprite.x, enemy.sprite.y
          );
          if (dist > range) continue;

          this.applyDamage(enemy, damage);
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
        break;
      }
    }
  }

  /** Duyệt projectile đang active mỗi frame: di chuyển (return/despawn) + kiểm tra va chạm enemy. */
  private updateProjectiles(): void {
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
        projectile.registerHit(enemy);

        if (!projectile.active) break; // projectile đã despawn (nổ / hết pierce) -> dừng kiểm tra enemy khác
      }
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

  /** Vòng tròn trắng/bạc lóe lên tại bán kính đánh của Sword, fade out sau ~150ms. */
  private drawSwordSlash(range: number): void {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xf5f5f5, 0.9);
    graphics.strokeCircle(this.player.sprite.x, this.player.sprite.y, range);

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 150,
      onComplete: () => graphics.destroy()
    });
  }

  private drawLightningEffect(targetX: number, targetY: number): void {
    const line = this.scene.add.line(
      0, 0,
      this.player.sprite.x, this.player.sprite.y,
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

  private findNearestEnemy() {
    const enemies = this.poolManager.getAllActiveEnemies();
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, e.sprite.x, e.sprite.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }
    return nearest;
  }
}
