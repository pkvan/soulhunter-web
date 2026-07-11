import Phaser from "phaser";
import { BootScene } from "@scenes/BootScene";
import { MenuScene } from "@scenes/MenuScene";
import { GameScene } from "@scenes/GameScene";
import { LevelUpScene } from "@scenes/LevelUpScene";
import { GameOverScene } from "@scenes/GameOverScene";

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 960,
  height: 540,
  backgroundColor: "#1a1a1a",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, GameScene, LevelUpScene, GameOverScene]
};

// Hằng số gameplay dùng chung — chỉnh ở đây thay vì rải rác trong code
export const GAMEPLAY = {
  RUN_DURATION_MS: 10 * 60 * 1000, // 10 phút, có thể chỉnh 10-15 phút
  BOSS_SPAWN_AT_MS: 5 * 60 * 1000,
  DIFFICULTY_RAMP_INTERVAL_MS: 30 * 1000, // mỗi 30s tăng độ khó 1 nấc
  MAGNET_BASE_RADIUS: 40,
  ENEMY_PLAYER_COLLISION_RADIUS: 20, // khoảng cách 2 tâm sprite được tính là va chạm
  ENEMY_HIT_COOLDOWN_MS: 500, // mỗi enemy chỉ gây damage cho player tối đa 1 lần/khoảng thời gian này
  PROJECTILE_HIT_RADIUS: 20 // khoảng cách 2 tâm sprite được tính là projectile trúng enemy
};
