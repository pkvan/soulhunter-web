import Phaser from "phaser";
import { PoolManager } from "@systems/PoolManager";
import { Player } from "@entities/Player";
import enemiesData from "@data/enemies.json";
import eliteData from "@data/elite.json";
import soulCorruptionData from "@data/soulCorruption.json";
import { EnemyDef, EliteConfig, SoulCorruptionConfig } from "@types/index";
import { GAMEPLAY } from "@config/GameConfig";

const enemies = enemiesData as EnemyDef[];
const elite = eliteData as EliteConfig;
const soulCorruption = soulCorruptionData as SoulCorruptionConfig;

/**
 * Spawn quái quanh player (ngoài tầm nhìn camera), tăng độ khó theo thời gian sống (GDD mục 1: "càng sống lâu càng mạnh").
 */
export class SpawnSystem {
  // Khoảng cách giữa 2 lần spawn co giãn theo difficultyMultiplier đã có sẵn (dùng lại thay vì thêm hệ
  // thời gian riêng): 1500ms lúc bắt đầu (multiplier=1) -> giảm dần xuống còn tối thiểu 400ms khi
  // multiplier tăng cao về cuối game, tạo cảm giác quái dồn dập hơn dần chứ không cố định suốt trận.
  private readonly SPAWN_INTERVAL_BASE_MS = 1500;
  private readonly SPAWN_INTERVAL_MIN_MS = 400;
  private lastSpawnAt = 0;
  private difficultyMultiplier = 1;
  private lastDifficultyRampAt = 0;
  private corruptionUntilTime = -Infinity; // "time" clock của Phaser (giống lastSpawnAt), xem activateCorruption()
  // Bước tăng ở giai đoạn "late" (sau DIFFICULTY_RAMP_ACCELERATION_AT_MS) — tự nhân dần theo
  // DIFFICULTY_RAMP_LATE_GROWTH_RATE mỗi nấc, tạo cảm giác khó tăng nhanh dần trước khi Boss xuất hiện
  // thay vì tuyến tính đều suốt game như trước.
  private lateRampStep = GAMEPLAY.DIFFICULTY_RAMP_EARLY_STEP;

  constructor(
    private scene: Phaser.Scene,
    private poolManager: PoolManager,
    private player: Player,
    private enemyHpMultiplier = 1 // Daily Challenge modifier (xem GameScene) — mặc định 1 khi chơi ván thường
  ) {}

  update(time: number, _delta: number): void {
    if (time - this.lastDifficultyRampAt > GAMEPLAY.DIFFICULTY_RAMP_INTERVAL_MS) {
      if (time >= GAMEPLAY.DIFFICULTY_RAMP_ACCELERATION_AT_MS) {
        this.difficultyMultiplier += this.lateRampStep;
        this.lateRampStep *= GAMEPLAY.DIFFICULTY_RAMP_LATE_GROWTH_RATE;
      } else {
        this.difficultyMultiplier += GAMEPLAY.DIFFICULTY_RAMP_EARLY_STEP;
      }
      this.lastDifficultyRampAt = time;
    }

    // Soul Corruption (Dark Soul pickup, xem GameScene.activateCorruption): trong lúc active, spawn dồn
    // dập hơn — nhân spawnIntervalMs xuống theo corruptionSpawnRateMultiplier (< 1 = nhanh hơn).
    const corruptionActive = time < this.corruptionUntilTime;
    const spawnIntervalMs = Math.max(
      this.SPAWN_INTERVAL_MIN_MS,
      (this.SPAWN_INTERVAL_BASE_MS / this.difficultyMultiplier) * (corruptionActive ? soulCorruption.corruptionSpawnRateMultiplier : 1)
    );
    if (time - this.lastSpawnAt > spawnIntervalMs) {
      this.spawnOne();
      this.lastSpawnAt = time;
    }
  }

  /** Bật cửa sổ "corruption" — dùng cùng clock (time) với lastSpawnAt nên không lệch khi tab bị throttle giữa 2 lần update(). */
  public activateCorruption(time: number, durationMs: number): void {
    this.corruptionUntilTime = time + durationMs;
  }

  private spawnOne(): void {
    const enemy = this.poolManager.getEnemy();
    if (!enemy) return; // pool hết chỗ, bỏ qua lần spawn này

    const def = this.pickEnemyDef();
    const { x, y } = this.getSpawnPositionOutsideCamera();
    const eliteChance = Math.min(
      elite.eliteChanceMax,
      elite.eliteChanceBase + Math.max(0, this.difficultyMultiplier - 1) * elite.eliteChancePerDifficulty
    );
    const isElite = Math.random() < eliteChance;
    enemy.spawn(x, y, def, this.difficultyMultiplier * this.enemyHpMultiplier, isElite);
  }

  private pickEnemyDef(): EnemyDef {
    // TODO: trọng số spawn nên đổi theo thời gian sống — đầu game nhiều Slime, cuối game nhiều Orc/Bat
    return enemies[Phaser.Math.Between(0, enemies.length - 1)];
  }

  private getSpawnPositionOutsideCamera(): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Math.max(cam.width, cam.height) * 0.7;
    return {
      x: this.player.sprite.x + Math.cos(angle) * distance,
      y: this.player.sprite.y + Math.sin(angle) * distance
    };
  }
}
