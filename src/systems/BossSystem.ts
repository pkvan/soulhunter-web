import Phaser from "phaser";
import { Boss } from "@entities/Boss";
import { Player } from "@entities/Player";
import { PoolManager } from "@systems/PoolManager";
import enemiesData from "@data/enemies.json";
import bossesData from "@data/bosses.json";
import { EnemyDef, BossDef } from "@types/index";
import { EventBus, GameEvents } from "@utils/EventBus";
import { GAMEPLAY } from "@config/GameConfig";

const enemies = enemiesData as EnemyDef[];
const bosses = bossesData as BossDef[];

/**
 * Quản lý vòng đời Boss (chỉ 1 instance/trận, không pool). Đọc các cờ pending* do Boss tự set mỗi frame
 * để xử lý phần cần PoolManager/Player mà Boss không giữ trực tiếp (summon quái, gây damage player, buff
 * enemy thường qua Roar). Va chạm Boss-Player cũng xử lý ở đây, tương tự CombatSystem cho Enemy thường.
 */
export class BossSystem {
  private boss: Boss | null = null;
  private lastContactAt = 0;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private poolManager: PoolManager
  ) {}

  /** bossIndex: thứ tự trong bosses.json — 0 = boss đầu tiên trong ván (Giant Skeleton), 1 = boss thứ 2 (Orc Warlord). */
  spawnBoss(bossIndex: number): void {
    if (this.boss) return; // đã có boss, tránh spawn chồng
    const bossDef = bosses[bossIndex];
    if (!bossDef) return;

    const { x, y } = this.getSpawnPositionOutsideCamera();
    this.boss = new Boss(this.scene, x, y, bossDef);
  }

  getBoss(): Boss | null {
    return this.boss;
  }

  update(time: number, _delta: number): void {
    const boss = this.boss;
    if (!boss) return;

    boss.update(time, this.player.sprite.x, this.player.sprite.y);

    const dist = Phaser.Math.Distance.Between(
      boss.sprite.x, boss.sprite.y,
      this.player.sprite.x, this.player.sprite.y
    );
    if (dist <= GAMEPLAY.BOSS_CONTACT_RADIUS && time - this.lastContactAt >= GAMEPLAY.BOSS_CONTACT_COOLDOWN_MS) {
      this.lastContactAt = time;
      const damage = boss.activeContactDamage ?? GAMEPLAY.BOSS_CONTACT_DAMAGE;
      this.player.takeDamage(damage);
    }

    if (boss.pendingSummon) {
      boss.pendingSummon = false;
      this.summonEnemies(boss);
    }

    if (boss.pendingSlamDamage) {
      boss.pendingSlamDamage = false;
      const distToSlamCenter = Phaser.Math.Distance.Between(
        boss.slamCenterX, boss.slamCenterY,
        this.player.sprite.x, this.player.sprite.y
      );
      if (distToSlamCenter <= boss.slamRadius) {
        this.player.takeDamage(boss.slamDamage);
      }
    }

    if (boss.pendingRoar) {
      boss.pendingRoar = false;
      this.applyRoarBuff(boss, time);
    }
  }

  /** WeaponSystem gọi khi vũ khí player trúng boss. Tự xử lý chết (destroy sprite + bắn BOSS_DEFEATED). */
  applyDamageToBoss(amount: number): void {
    const boss = this.boss;
    if (!boss) return;
    const isDead = boss.takeDamage(amount);
    if (isDead) this.killBoss();
  }

  private killBoss(): void {
    if (!this.boss) return;
    this.boss.destroy();
    this.boss = null;
    EventBus.emit(GameEvents.BOSS_DEFEATED);
  }

  private summonEnemies(boss: Boss): void {
    for (let i = 0; i < boss.summonCount; i++) {
      const enemy = this.poolManager.getEnemy();
      if (!enemy) break; // pool hết chỗ, bỏ qua phần còn lại của đợt summon này

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const spawnDist = 60;
      const def = enemies[Phaser.Math.Between(0, enemies.length - 1)];
      enemy.spawn(boss.sprite.x + Math.cos(angle) * spawnDist, boss.sprite.y + Math.sin(angle) * spawnDist, def, 1);
    }
  }

  /** Roar: buff moveSpeed/damage cho enemy thường trong bán kính quanh boss, tạm thời (xem Enemy.applyBuff). */
  private applyRoarBuff(boss: Boss, time: number): void {
    for (const enemy of this.poolManager.getAllActiveEnemies()) {
      const dist = Phaser.Math.Distance.Between(boss.sprite.x, boss.sprite.y, enemy.sprite.x, enemy.sprite.y);
      if (dist > boss.roarRadius) continue;
      enemy.applyBuff(1 + boss.roarMoveSpeedBuff, 1 + boss.roarDamageBuff, boss.roarDurationMs, time);
    }
  }

  private getSpawnPositionOutsideCamera(): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Math.max(cam.width, cam.height) * GAMEPLAY.BOSS_SPAWN_DISTANCE_MULTIPLIER;
    return {
      x: this.player.sprite.x + Math.cos(angle) * distance,
      y: this.player.sprite.y + Math.sin(angle) * distance
    };
  }
}
