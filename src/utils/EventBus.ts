import Phaser from "phaser";

/**
 * EventBus dùng chung để GameScene và UI Scene (LevelUpScene, HUD...) giao tiếp
 * mà không cần tham chiếu trực tiếp lẫn nhau.
 *
 * Ví dụ event nên định nghĩa ở đây: LEVEL_UP, PLAYER_DIED, BOSS_SPAWNED, FUSION_TRIGGERED
 */
export const EventBus = new Phaser.Events.EventEmitter();

export const GameEvents = {
  LEVEL_UP: "level_up",
  PLAYER_DIED: "player_died",
  BOSS_SPAWNED: "boss_spawned",
  BOSS_DEFEATED: "boss_defeated",
  FINAL_BOSS_DEFEATED: "final_boss_defeated",
  BOSS_LOOT_RESOLVED: "boss_loot_resolved",
  FUSION_TRIGGERED: "fusion_triggered",
  SOUL_COLLECTED: "soul_collected",
  CHALLENGE_PROGRESS_UPDATED: "challenge_progress_updated",
  CHALLENGE_DAY_UNLOCKED: "challenge_day_unlocked",
  CHALLENGE_REWARD_CLAIMED: "challenge_reward_claimed",
  COLLECTION_UNLOCKED: "collection_unlocked"
} as const;
