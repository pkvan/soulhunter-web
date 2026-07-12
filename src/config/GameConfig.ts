import Phaser from "phaser";
import { BootScene } from "@scenes/BootScene";
import { MenuScene } from "@scenes/MenuScene";
import { MapSelectScene } from "@scenes/MapSelectScene";
import { UnlockScene } from "@scenes/UnlockScene";
import { GameScene } from "@scenes/GameScene";
import { LevelUpScene } from "@scenes/LevelUpScene";
import { PauseScene } from "@scenes/PauseScene";
import { BossLootScene } from "@scenes/BossLootScene";
import { GameOverScene } from "@scenes/GameOverScene";
import { VictoryScene } from "@scenes/VictoryScene";

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
  scene: [BootScene, MenuScene, MapSelectScene, UnlockScene, GameScene, LevelUpScene, PauseScene, BossLootScene, GameOverScene, VictoryScene]
};

// Hằng số gameplay dùng chung — chỉnh ở đây thay vì rải rác trong code
export const GAMEPLAY = {
  RUN_DURATION_MS: 10 * 60 * 1000, // 10 phút, có thể chỉnh 10-15 phút
  BOSS_SPAWN_AT_MS: 10 * 1000, // TODO: đang để 10s để test nhanh — chỉnh lại 2 * 60 * 1000 (2 phút) sau khi test xong luồng Boss
  DIFFICULTY_RAMP_INTERVAL_MS: 30 * 1000, // mỗi 30s tăng độ khó 1 nấc
  DIFFICULTY_RAMP_ACCELERATION_AT_MS: 5 * 60 * 1000, // trước mốc này ramp tuyến tính chậm, sau mốc này ramp theo cấp số nhân nhẹ (dồn khó trước Boss)
  DIFFICULTY_RAMP_EARLY_STEP: 0.08, // mỗi nấc trước mốc tăng tốc (chậm hơn 0.1 cũ — đầu game giết nhanh, cảm giác mạnh lên rõ)
  DIFFICULTY_RAMP_LATE_GROWTH_RATE: 1.06, // sau mốc tăng tốc, mỗi nấc lại nhân bước tăng thêm 6% — cấp số nhân nhẹ
  MAX_LEVEL: 30, // player.gainSoul() chặn level thêm khi đạt mốc này, soul dư đổi thành bonusCoinFromOverflowSoul
  MAGNET_BASE_RADIUS: 40,
  ENEMY_PLAYER_COLLISION_RADIUS: 20, // khoảng cách 2 tâm sprite được tính là va chạm
  PICKUP_COLLECT_RADIUS: 24, // khoảng cách 2 tâm sprite được tính là player nhặt được Pickup (Heal Potion/Magnet Orb)

  // Feedback khi player nhận damage (Player.takeDamage) — flash đỏ + screen shake, mạnh hơn nếu đòn đủ nặng.
  PLAYER_HIT_FLASH_MS: 100,
  PLAYER_HIT_FLASH_COLOR: 0xff0000,
  PLAYER_HIT_SHAKE_MIN_PERCENT: 0.02, // bỏ qua shake nếu damage < 2% Max HP (vd DOT tick nhỏ lẻ) để tránh rung liên tục
  PLAYER_HIT_SHAKE_DURATION_MS: 100,
  PLAYER_HIT_SHAKE_INTENSITY: 0.005,
  PLAYER_HIT_BIG_THRESHOLD_PERCENT: 0.15, // đòn > 15% Max HP coi là "nặng", shake mạnh hơn
  PLAYER_HIT_BIG_SHAKE_DURATION_MS: 200,
  PLAYER_HIT_BIG_SHAKE_INTENSITY: 0.015,
  ENEMY_HIT_COOLDOWN_MS: 500, // mỗi enemy chỉ gây damage cho player tối đa 1 lần/khoảng thời gian này
  PROJECTILE_HIT_RADIUS: 20, // khoảng cách 2 tâm sprite được tính là projectile trúng enemy

  // Boss — xem entities/Boss.ts + systems/BossSystem.ts. Số liệu riêng theo từng boss/skill nằm trong
  // src/data/bosses.json + src/data/bossSkills.json (data-driven); ở đây chỉ còn hằng số dùng chung
  // cho mọi boss (va chạm, vị trí spawn) — không phụ thuộc loại boss cụ thể nào.
  BOSS_SPAWN_DISTANCE_MULTIPLIER: 0.9, // spawn ngoài camera, tính theo cam.width/height giống SpawnSystem
  BOSS_CONTACT_RADIUS: 36, // sprite boss to hơn enemy thường nên bán kính va chạm lớn hơn ENEMY_PLAYER_COLLISION_RADIUS
  BOSS_CONTACT_DAMAGE: 15, // damage va chạm cơ bản khi boss không trong pha active của dash/charge (skill tự có damage riêng)
  BOSS_CONTACT_COOLDOWN_MS: 800,

  ICE_SHARD_FREEZE_DURATION_MS: 1200, // freeze_chance upgrade: đóng băng HẲN (factor 1) thay vì chỉ slow baseline, xem WeaponSystem.applyOnHitEffects
  SWORD_HP_BONUS: 30, // cộng thêm Max HP khi Sword nằm trong equippedWeapons, trừ lại khi mất (fusion) — xem Player.syncSwordHpBonus()

  LOOT_CHEST_COLLECT_RADIUS: 30, // khoảng cách 2 tâm được tính là player va chạm nhặt Loot Chest (rương chiến lợi phẩm boss giữa chừng) — xem GameScene.update()

  // Boss Death Cinematic khi hạ Final Boss (isFinalBoss: true trong bosses.json) — xem systems/VictoryController.ts.
  // Trình tự: Zoom camera (VICTORY_ZOOM_MS, timeScale vẫn 1) -> Slow Motion + boss tan biến (phần thời gian
  // còn lại của VICTORY_CINEMATIC_TOTAL_MS, timeScale = VICTORY_SLOWMO_TIMESCALE) -> trả timeScale về 1.
  // this.tweens KHÔNG phụ thuộc time.timeScale nên mọi duration ở đây là thời gian thật, không cần bù trừ.
  VICTORY_ZOOM_LEVEL: 1.3, // zoom vừa phải, chỉ tạo cảm giác cinematic, không quá mạnh
  VICTORY_ZOOM_MS: 400,
  VICTORY_SLOWMO_TIMESCALE: 0.25, // 25% tốc độ bình thường (trong khoảng 20-30% yêu cầu)
  VICTORY_CINEMATIC_TOTAL_MS: 3000, // tổng thời lượng cinematic thật, tính từ lúc boss chết tới lúc tan biến hoàn toàn
  VICTORY_PARTICLE_COUNT: 8 // số đốm sáng "linh hồn thoát ra" bay lên trong lúc boss tan biến
};
