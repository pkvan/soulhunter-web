import Phaser from "phaser";
import { Boss } from "@entities/Boss";
import { Enemy } from "@entities/Enemy";
import { Player } from "@entities/Player";
import { PoolManager } from "@systems/PoolManager";
import bossesData from "@data/bosses.json";
import { EnemyDef, BossDef } from "@types/index";
import { EventBus, GameEvents } from "@utils/EventBus";
import { GAMEPLAY } from "@config/GameConfig";
import { CollectionManager } from "@systems/CollectionManager";

const bosses = bossesData as BossDef[];

/** Vùng mây độc (poison_cloud) sống độc lập với vòng đời Boss — vẫn tick damage dù Boss đã chết trước khi mây tan. */
interface PoisonZone {
  x: number;
  y: number;
  radius: number;
  tickDamage: number;
  tickIntervalMs: number;
  nextTickAt: number;
  expiresAt: number;
  graphics: Phaser.GameObjects.Graphics;
}

/** Bản sao (clone skill) hết hạn cưỡng bức sau đúng thời lượng dù player chưa kịp giết — dùng chung Enemy/PoolManager nên tự chết sớm hơn (bị đánh) vẫn hoạt động bình thường, chỉ cần bỏ qua nếu enemy.active đã false. */
interface ActiveClone {
  enemy: Enemy;
  expiresAt: number;
}

/**
 * Quản lý vòng đời Boss (chỉ 1 instance/trận, không pool). Đọc các cờ pending* do Boss tự set mỗi frame
 * để xử lý phần cần PoolManager/Player mà Boss không giữ trực tiếp (summon quái, gây damage player, buff
 * enemy thường qua Roar). Va chạm Boss-Player cũng xử lý ở đây, tương tự CombatSystem cho Enemy thường.
 */
export class BossSystem {
  private boss: Boss | null = null;
  private lastContactAt = 0;
  private poisonZones: PoisonZone[] = [];
  private activeClones: ActiveClone[] = [];

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private poolManager: PoolManager,
    private enemies: EnemyDef[] // bộ quái theo map hiện tại (xem utils/MapData.ts) — dùng cho Summon skill, thay cho import enemies.json cố định
  ) {}

  /** bossId: tham chiếu bosses.json — xác định qua mapDef.bossId của map đang chơi (xem GameScene + utils/MapData.ts). */
  spawnBoss(bossId: string): void {
    if (this.boss) return; // đã có boss, tránh spawn chồng
    const bossDef = bosses.find((b) => b.id === bossId);
    if (!bossDef) return;

    const { x, y } = this.getSpawnPositionOutsideCamera();
    this.boss = new Boss(this.scene, x, y, bossDef);
    CollectionManager.unlockBoss(bossId); // Collection: Boss mở khi gặp (đánh bại luôn kéo theo đã từng gặp)
  }

  getBoss(): Boss | null {
    return this.boss;
  }

  update(time: number, _delta: number): void {
    this.updatePoisonZones(time);
    this.updateActiveClones(time);

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

    if (boss.pendingFreezePulse) {
      boss.pendingFreezePulse = false;
      const distToBoss = Phaser.Math.Distance.Between(
        boss.sprite.x, boss.sprite.y,
        this.player.sprite.x, this.player.sprite.y
      );
      if (distToBoss <= boss.freezePulseRadius) {
        this.player.applySlow(boss.freezePulseSlowFactor, boss.freezePulseDurationMs, time);
      }
    }

    if (boss.pendingPoisonCloud) {
      boss.pendingPoisonCloud = false;
      this.spawnPoisonZone(boss, time);
    }

    if (boss.pendingClone) {
      boss.pendingClone = false;
      this.spawnClone(boss, time);
    }
  }

  /** WeaponSystem gọi khi vũ khí player trúng boss. Tự xử lý chết (destroy sprite + bắn BOSS_DEFEATED). */
  applyDamageToBoss(amount: number): void {
    const boss = this.boss;
    if (!boss) return;
    const isDead = boss.takeDamage(amount);
    if (isDead) this.killBoss();
  }

  /**
   * Final Boss (isFinalBoss: true trong bosses.json) chết đi thẳng cutscene chiến thắng (slow-motion +
   * fade, xem GameScene.onFinalBossDefeated) — KHÔNG destroy() sprite ngay ở đây vì GameScene còn cần
   * tween scale/alpha nó trong lúc cutscene chạy, tự destroy sau khi xong. Boss thường (không phải final)
   * vẫn giữ nguyên hành vi cũ: destroy ngay, rơi Loot Chest tại vị trí vừa chết.
   */
  private killBoss(): void {
    if (!this.boss) return;
    const boss = this.boss;
    const deathX = boss.sprite.x;
    const deathY = boss.sprite.y;
    this.boss = null;

    if (boss.isFinalBoss) {
      boss.stopForDeathCutscene(); // BƯỚC 0: dừng tuyệt đối trước khi GameScene chạy cutscene chiến thắng
      EventBus.emit(GameEvents.FINAL_BOSS_DEFEATED, { boss, x: deathX, y: deathY });
    } else {
      boss.destroy();
      EventBus.emit(GameEvents.BOSS_DEFEATED, { x: deathX, y: deathY });
    }
  }

  private summonEnemies(boss: Boss): void {
    for (let i = 0; i < boss.summonCount; i++) {
      const enemy = this.poolManager.getEnemy();
      if (!enemy) break; // pool hết chỗ, bỏ qua phần còn lại của đợt summon này

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const spawnDist = 60;
      const def = this.enemies[Phaser.Math.Between(0, this.enemies.length - 1)];
      enemy.spawn(boss.sprite.x + Math.cos(angle) * spawnDist, boss.sprite.y + Math.sin(angle) * spawnDist, def, 1);
    }
  }

  /** Thả 1 vùng mây độc tại vị trí boss lúc cast — vẽ 1 lần, tick damage cho player mỗi tickIntervalMs nếu đang đứng trong bán kính, tự dọn sau durationMs. */
  private spawnPoisonZone(boss: Boss, time: number): void {
    const graphics = this.scene.add.graphics().setDepth(2);
    graphics.fillStyle(0x4ade80, 0.18);
    graphics.fillCircle(boss.sprite.x, boss.sprite.y, boss.poisonCloudRadius);
    graphics.lineStyle(2, 0x4ade80, 0.5);
    graphics.strokeCircle(boss.sprite.x, boss.sprite.y, boss.poisonCloudRadius);

    this.poisonZones.push({
      x: boss.sprite.x,
      y: boss.sprite.y,
      radius: boss.poisonCloudRadius,
      tickDamage: boss.poisonCloudTickDamage,
      tickIntervalMs: boss.poisonCloudTickIntervalMs,
      nextTickAt: time + boss.poisonCloudTickIntervalMs,
      expiresAt: time + boss.poisonCloudDurationMs,
      graphics
    });
  }

  /** Chạy MỖI FRAME (kể cả khi Boss đã null/chết) — mây độc là hazard độc lập, không phụ thuộc vòng đời Boss. */
  private updatePoisonZones(time: number): void {
    for (let i = this.poisonZones.length - 1; i >= 0; i--) {
      const zone = this.poisonZones[i];
      if (time >= zone.expiresAt) {
        zone.graphics.destroy();
        this.poisonZones.splice(i, 1);
        continue;
      }
      if (time < zone.nextTickAt) continue;
      zone.nextTickAt = time + zone.tickIntervalMs;

      const dist = Phaser.Math.Distance.Between(zone.x, zone.y, this.player.sprite.x, this.player.sprite.y);
      if (dist <= zone.radius) this.player.takeDamage(zone.tickDamage);
    }
  }

  /**
   * Spawn 1 "bản sao" boss bằng CHÍNH PoolManager.getEnemy() — tái dùng toàn bộ AI đuổi theo/damage va
   * chạm/bị vũ khí player gây damage/rơi Soul lúc chết (Enemy.update() + CombatSystem + WeaponSystem đã lo
   * hết, không cần entity mới). EnemyDef tổng hợp tại runtime từ số liệu cloneHp/cloneDamage/cloneMoveSpeed
   * trong bossSkills.json — id đặt riêng theo boss để không trùng monster thật nào trong Collection.
   */
  private spawnClone(boss: Boss, time: number): void {
    const enemy = this.poolManager.getEnemy();
    if (!enemy) return; // pool hết chỗ, bỏ qua lần triệu hồi clone này

    const syntheticDef: EnemyDef = {
      id: `${boss.id}_clone`,
      name: `${boss.name} (Bản Sao)`,
      hp: boss.cloneHp,
      moveSpeed: boss.cloneMoveSpeed,
      damage: boss.cloneDamage,
      soulValue: 1,
      flag: "ground",
      tintColor: `0x${boss.color.toString(16).padStart(6, "0")}`,
      alpha: 0.55 // mờ hơn bản gốc — đúng yêu cầu "sprite mờ hơn"
    };

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const spawnDist = 50;
    enemy.spawn(boss.sprite.x + Math.cos(angle) * spawnDist, boss.sprite.y + Math.sin(angle) * spawnDist, syntheticDef, 1);
    this.activeClones.push({ enemy, expiresAt: time + boss.cloneDurationMs });
  }

  /** Hết cloneDurationMs mà player chưa kịp giết thì tự despawn — nếu đã bị giết trước đó (enemy.active=false) thì chỉ cần bỏ khỏi danh sách theo dõi, không despawn lại. */
  private updateActiveClones(time: number): void {
    for (let i = this.activeClones.length - 1; i >= 0; i--) {
      const clone = this.activeClones[i];
      if (!clone.enemy.active) {
        this.activeClones.splice(i, 1);
        continue;
      }
      if (time >= clone.expiresAt) {
        clone.enemy.despawn();
        this.activeClones.splice(i, 1);
      }
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
