import Phaser from "phaser";
import { PoolManager } from "@systems/PoolManager";
import { Player } from "@entities/Player";
import { SoulSystem } from "@systems/SoulSystem";
import { Pickup } from "@entities/Pickup";
import pickupsData from "@data/pickups.json";
import { PickupDef } from "@types/index";
import { GAMEPLAY } from "@config/GameConfig";

const pickups = pickupsData as PickupDef[];

/**
 * Spawn Heal Potion/Magnet Orb ngẫu nhiên gần player (trong tầm nhìn camera, không đè lên player) —
 * mỗi khoảng SPAWN_INTERVAL_*_MS roll % xuất hiện 1 pickup, tự fade-out + despawn nếu không nhặt
 * trong LIFETIME_MS. Dùng PoolManager (pool nhỏ) thay vì tạo GameObject mới mỗi lần spawn.
 */
export class PickupSystem {
  private readonly SPAWN_INTERVAL_MIN_MS = 15000;
  private readonly SPAWN_INTERVAL_MAX_MS = 20000;
  private readonly SPAWN_CHANCE = 0.6; // 60% mỗi lần tới hạn roll có pickup xuất hiện, không phải cứ tới hạn là chắc chắn có
  private readonly LIFETIME_MS = 10000;
  private readonly FADE_DURATION_MS = 600;
  private readonly SPAWN_DISTANCE_MIN = 120; // đủ xa để không spawn đè lên player
  private readonly SPAWN_DISTANCE_MAX = 260; // vẫn trong tầm nhìn camera, không như Enemy spawn ngoài camera

  private nextRollAt = 0;

  constructor(
    private scene: Phaser.Scene,
    private poolManager: PoolManager,
    private player: Player,
    private soulSystem: SoulSystem
  ) {
    this.scheduleNextRoll(0);
  }

  update(time: number, _delta: number): void {
    if (time >= this.nextRollAt) {
      this.tryRollSpawn(time);
      this.scheduleNextRoll(time);
    }

    for (const pickup of this.poolManager.getAllActivePickups()) {
      if (pickup.fading) continue; // đang chạy tween fade-out, chờ Pickup.despawn() tự gọi ở onComplete

      if (time - pickup.spawnedAt >= this.LIFETIME_MS) {
        this.fadeOutAndDespawn(pickup);
        continue;
      }

      const dist = Phaser.Math.Distance.Between(
        pickup.sprite.x, pickup.sprite.y,
        this.player.sprite.x, this.player.sprite.y
      );
      if (dist < GAMEPLAY.PICKUP_COLLECT_RADIUS) {
        this.applyPickupEffect(pickup);
        pickup.despawn();
      }
    }
  }

  private scheduleNextRoll(time: number): void {
    const interval = Phaser.Math.Between(this.SPAWN_INTERVAL_MIN_MS, this.SPAWN_INTERVAL_MAX_MS);
    this.nextRollAt = time + interval;
  }

  private tryRollSpawn(time: number): void {
    if (Math.random() > this.SPAWN_CHANCE) return;

    const pickup = this.poolManager.getPickup();
    if (!pickup) return; // pool hết chỗ (hiếm khi xảy ra với 5 slot), bỏ qua lần roll này

    const def = pickups[Phaser.Math.Between(0, pickups.length - 1)];
    const { x, y } = this.getSpawnPositionNearPlayer();
    pickup.spawn(x, y, def, time);
  }

  /** Vị trí gần player nhưng không đè lên — tương tự SpawnSystem.getSpawnPositionOutsideCamera nhưng bán kính nhỏ hơn nhiều, trong tầm nhìn. */
  private getSpawnPositionNearPlayer(): { x: number; y: number } {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(this.SPAWN_DISTANCE_MIN, this.SPAWN_DISTANCE_MAX);
    return {
      x: this.player.sprite.x + Math.cos(angle) * distance,
      y: this.player.sprite.y + Math.sin(angle) * distance
    };
  }

  private applyPickupEffect(pickup: Pickup): void {
    if (pickup.def.id === "heal_potion") {
      const healAmount = (pickup.def.healPercent ?? 0) * this.player.stats.maxHp;
      this.player.heal(healAmount);
      this.showHealFlash();
    } else if (pickup.def.id === "magnet_orb") {
      this.soulSystem.collectAllWithMagnet(Number(pickup.def.color));
    }
  }

  /** Vòng tròn xanh lá phóng to rồi fade quanh player khi nhặt Heal Potion — placeholder cho particle effect thật sau này. */
  private showHealFlash(): void {
    const flash = this.scene.add.circle(this.player.sprite.x, this.player.sprite.y, 20, 0x4ade80, 0.5).setDepth(4);
    this.scene.tweens.add({
      targets: flash,
      radius: 40,
      alpha: 0,
      duration: 400,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy()
    });
  }

  private fadeOutAndDespawn(pickup: Pickup): void {
    pickup.fading = true;
    this.scene.tweens.add({
      targets: pickup.sprite,
      alpha: 0,
      duration: this.FADE_DURATION_MS,
      onComplete: () => pickup.despawn()
    });
  }
}
