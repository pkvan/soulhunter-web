export interface WeaponDef {
  id: string;
  name: string;
  type: "melee" | "projectile_straight" | "projectile_pierce" | "random_target" | "projectile_return";
  baseDamage: number;
  baseCooldownMs: number;
  maxLevel: number;
  description: string;
  color?: string; // hex string (vd "0xf97316") — màu icon placeholder dùng chung ở LevelUpCard/HUD, xem ui/WeaponIcon.ts
  rarity?: string; // chưa có data nào gán giá trị — chỉ để kiến trúc Card sẵn sàng hiện Rarity khi có
  locked?: boolean; // vũ khí đặc biệt chưa mở khóa từ đầu — chỉ unlock qua Daily Login Day7 hoặc Boss Loot Wheel, xem SaveData.isWeaponUnlocked()
  unlockCostCoin?: number; // chỉ dùng để so sánh "rẻ nhất" khi chọn vũ khí unlock ngẫu nhiên, không có màn mua trực tiếp
  [key: string]: unknown;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description?: string; // mô tả ngắn (tối đa ~2 dòng khi render) giải thích upgrade làm gì — hiện trong LevelUpCard
  rarity?: string; // chưa có data nào gán giá trị — chỉ để kiến trúc Card sẵn sàng hiện Rarity khi có
  stat: string;
  value: number;
  stackable: boolean;
  appliesTo?: string | string[]; // 1 weaponId hoặc mảng nhiều weaponId (vd Shrapnel áp cho cả Fireball/Ice Shard)
}

export interface FusionDef {
  id: string;
  name: string;
  requires: [string, string];
  effect: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  moveSpeed: number;
  damage: number;
  soulValue: number;
  flag: "ground" | "phasing" | "flying";
  tintColor?: string; // hex string (vd "0x4ade80") — Enemy.spawn() setTint() theo màu này để phân biệt loại quái bằng mắt
  alpha?: number; // vd Ghost 0.7 để có cảm giác trong suốt
  meleeDodgeChance?: number; // 0-1, xác suất né đòn melee (vd Ghost) — check trong WeaponSystem lúc tính damage melee
  movementPattern?: "straight" | "zigzag"; // vd Bat "zigzag" — xem Enemy.update()
}

/** Pickup ngẫu nhiên (Heal Potion / Magnet Orb) — xem PickupSystem. */
export interface PickupDef {
  id: string;
  color: string; // hex string (vd "0xff4d6d") — Pickup.spawn() dùng Number(color) để setFillStyle
  healPercent?: number; // chỉ heal_potion — % maxHp hồi lại
}

/** Elite Enemy (roll ngẫu nhiên khi spawn, xem SpawnSystem) — HP/scale lớn hơn, luôn thưởng thêm Coin khi giết. */
export interface EliteConfig {
  eliteChanceBase: number;
  eliteChancePerDifficulty: number; // cộng thêm vào eliteChance theo mỗi điểm difficultyMultiplier vượt quá 1
  eliteChanceMax: number;
  eliteHpMultiplier: number;
  eliteScale: number;
  eliteGlowColor: string; // hex string, Number(color)
  eliteCoinBonus: number;
}

/** Dark Soul (Soul Corruption) — chỉ rơi từ Elite Enemy chết, nhặt vào kích hoạt buff damage tạm thời + tăng tốc độ spawn quái. */
export interface SoulCorruptionConfig {
  darkSoulDropChance: number;
  darkSoulValueMultiplier: number; // nhân vào enemy.def.soulValue gốc khi rơi Dark Soul
  darkSoulColor: string;
  corruptionDamageBonus: number; // cộng thẳng vào player.stats.damageMultiplier trong lúc active
  corruptionDurationMs: number;
  corruptionSpawnRateMultiplier: number; // nhân vào spawnIntervalMs của SpawnSystem trong lúc active (giảm = spawn dồn dập hơn)
}

export interface BossDef {
  id: string;
  name: string;
  color: string; // hex string (vd "0xd1d5db") — Boss tint sprite + màu HP bar/banner theo giá trị này
  hp: number;
  moveSpeed: number;
  skillIds: string[]; // tham chiếu tới bossSkills.json; thứ tự trong mảng = thứ tự ưu tiên khi nhiều skill cùng hết cooldown
  isFinalBoss?: boolean; // true = boss cuối cùng của ván — chết đi thẳng cutscene chiến thắng (slow-motion + fade), KHÔNG rơi Loot Chest như boss thường
}

/**
 * 1 kỹ năng boss dùng chung được (dash/charge cùng cơ chế lao nhanh, chỉ khác số liệu; ground_slam;
 * summon; roar) — Boss.ts đọc theo `type` để biết chạy state nào, không hardcode riêng cho từng boss.
 */
export interface BossSkillDef {
  id: string;
  type: "dash" | "charge" | "ground_slam" | "summon" | "roar";
  cooldownMs: number;
  telegraphMs?: number; // dash/charge/ground_slam
  speed?: number; // dash/charge
  durationMs?: number; // dash/charge (thời lượng lao), roar (thời lượng buff)
  damage?: number; // dash/charge/ground_slam
  radius?: number; // ground_slam/roar
  count?: number; // summon
  moveSpeedBuff?: number; // roar, vd 0.3 = +30%
  damageBuff?: number; // roar, vd 0.2 = +20%
}

/** 1 map trong bản đồ đảo liên kết (data/maps.json, xem MapSelectScene) — mỗi map có bộ quái + boss cuối riêng. */
export interface MapDef {
  id: string;
  name: string;
  order: number;
  theme_color: string; // hex string, dùng làm màu nền node trên MapSelectScene
  enemyDataFile: string; // tên file trong src/data/ (vd "enemies.json") — resolve qua utils/MapData.ts, không import động trực tiếp
  bossId: string; // tham chiếu bosses.json — boss cuối cùng (luôn isFinalBoss) của map này
  difficultyMultiplier: number; // nhân thêm vào difficultyMultiplier gốc của SpawnSystem, map càng về sau càng khó hơn
  unlockRequires: string | null; // id map phải clear trước, null = mở sẵn từ đầu
}

export interface CharacterDef {
  id: string;
  name: string;
  baseHp: number;
  baseMoveSpeed: number;
  startingWeapon: string;
  unlocked: boolean;
  unlockCostCoin: number;
}

/** Meta progression mua bằng Coin, áp dụng vĩnh viễn cho mọi ván (xem GDD mục 13) — mua được nhiều lần, giá tăng dần. */
export interface PermanentUpgradeDef {
  id: string;
  name: string;
  stat: string; // key trong PlayerStats sẽ được cộng thêm value * số lần đã mua (xem Player.ts constructor)
  value: number;
  baseCostCoin: number;
  costMultiplier: number; // giá nhân lên mỗi lần đã mua, vd 1.3 = +30%/lần
  maxPurchases: number; // giới hạn số lần mua tối đa — chặn vỡ balance nếu Coin tích lũy nhiều về sau
}

export interface PlayerStats {
  maxHp: number;
  currentHp: number;
  moveSpeed: number;
  damageMultiplier: number;
  cooldownMultiplier: number;
  critChance: number;
  critDamageMultiplier: number;
  lifeStealPercent: number;
  pickupRadiusMultiplier: number;
  shieldCharges: number;
  [key: string]: number;
}

export interface EquippedWeapon {
  weaponId: string;
  level: number;
  fusedInto?: string;
}

/** Dùng cho GameOverScene — CHỈ trường hợp thua trận (HP về 0). Thắng trận (hạ Final Boss) đi qua VictoryScene, không dùng interface này. */
export interface RunResult {
  survivalTimeMs: number;
  kills: number;
  coinEarned: number;
  highestCombo: number;
}

/** Mốc giết quái tích lũy qua nhiều ván (GDD mục 15) — thưởng Coin 1 lần khi đạt mốc. */
export interface AchievementDef {
  id: string;
  name: string;
  killThreshold: number;
  rewardCoin: number;
}

/** Modifier Daily Challenge (GDD mục 15) — chọn cố định theo ngày, khó hơn nhưng đổi lại nhiều Coin hơn. */
export interface DailyChallengeDef {
  id: string;
  name: string;
  description: string;
  enemyHpMultiplier: number;
  playerDamageMultiplier: number;
  coinRewardMultiplier: number;
}

/** 1 mốc trong chuỗi 7 ngày Daily Login Reward (data/dailyRewards.json) — xem SaveData.checkAndAdvanceLoginStreak(). */
export interface DailyRewardDef {
  day: number;
  coin: number;
  specialUnlock?: boolean; // chỉ Day 7 — mở khóa 1 vũ khí đặc biệt rẻ nhất chưa unlock, CHỈ 1 LẦN DUY NHẤT trong toàn bộ lịch sử chơi
  permanentUpgradeToken?: boolean;
}

/** 1 ô trong vòng xoay chiến lợi phẩm Boss (data/bossLootWheel.json) — xem scenes/BossLootScene.ts. */
export interface BossLootDef {
  id: string;
  name: string;
  weight: number; // trọng số roll ngẫu nhiên, cũng dùng để chia góc vòng quay
  type: "coin" | "darkSoul" | "upgradeToken" | "healFull" | "unlockWeapon";
  minCoin?: number; // "coin" và "darkSoul" đều random Coin trong khoảng này
  maxCoin?: number;
}

/** 1 trong 3 lựa chọn khi level up: fusion (2 vũ khí gốc -> 1 vũ khí mới, xem FusionSystem). */
export interface FusionChoice {
  fusion: true;
  fusionId: string;
}

/** 1 trong 3 lựa chọn khi level up: thêm vũ khí chưa equip, hoặc nâng cấp level vũ khí đã equip. */
export interface WeaponChoice {
  weapon: true;
  weaponId: string;
  isNew: boolean;
}

export type UpgradeChoice = UpgradeDef | FusionChoice | WeaponChoice;
