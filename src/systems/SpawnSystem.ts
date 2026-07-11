import Phaser from "phaser";
import { PoolManager } from "@systems/PoolManager";
import { Player } from "@entities/Player";
import enemiesData from "@data/enemies.json";
import { EnemyDef } from "@types/index";
import { GAMEPLAY } from "@config/GameConfig";

const enemies = enemiesData as EnemyDef[];

/**
 * Spawn quái quanh player (ngoài tầm nhìn camera), tăng độ khó theo thời gian sống (GDD mục 1: "càng sống lâu càng mạnh").
 */
export class SpawnSystem {
  private lastSpawnAt = 0;
  private spawnIntervalMs = 800; // TODO: giảm dần theo thời gian để tăng độ khó
  private difficultyMultiplier = 1;
  private lastDifficultyRampAt = 0;

  constructor(
    private scene: Phaser.Scene,
    private poolManager: PoolManager,
    private player: Player
  ) {}

  update(time: number, _delta: number): void {
    if (time - this.lastDifficultyRampAt > GAMEPLAY.DIFFICULTY_RAMP_INTERVAL_MS) {
      this.difficultyMultiplier += 0.1; // TODO: tune tốc độ tăng khó
      this.lastDifficultyRampAt = time;
    }

    if (time - this.lastSpawnAt > this.spawnIntervalMs) {
      this.spawnOne();
      this.lastSpawnAt = time;
    }
  }

  private spawnOne(): void {
    const enemy = this.poolManager.getEnemy();
    if (!enemy) return; // pool hết chỗ, bỏ qua lần spawn này

    const def = this.pickEnemyDef();
    const { x, y } = this.getSpawnPositionOutsideCamera();
    enemy.spawn(x, y, def, this.difficultyMultiplier);
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
