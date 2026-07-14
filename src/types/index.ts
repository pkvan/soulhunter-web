/** 4 bậc độ hiếm dùng chung cho màu viền Card (Collection + LevelUp) — xem ui/CollectionCard.ts RARITY_COLORS. */
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface WeaponDef {
  id: string;
  name: string;
  type: "melee" | "projectile_straight" | "projectile_pierce" | "random_target" | "projectile_return";
  baseDamage: number;
  baseCooldownMs: number;
  maxLevel: number;
  description: string;
  color?: string; // hex string (vd "0xf97316") — màu icon placeholder dùng chung ở CollectionCard/HUD, xem ui/WeaponIcon.ts
  rarity?: Rarity;
  locked?: boolean; // vũ khí đặc biệt chưa mở khóa từ đầu — chỉ unlock qua Daily Login Day7 hoặc Boss Loot Wheel, xem SaveData.isWeaponUnlocked()
  unlockCostCoin?: number; // chỉ dùng để so sánh "rẻ nhất" khi chọn vũ khí unlock ngẫu nhiên, không có màn mua trực tiếp
  [key: string]: unknown;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description?: string; // mô tả ngắn (tối đa ~2 dòng khi render) giải thích upgrade làm gì — hiện trong CollectionCard
  rarity?: Rarity;
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
  description?: string; // chỉ dùng hiển thị tab Monsters của CollectionScene, không ảnh hưởng gameplay
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
  description?: string; // chỉ dùng hiển thị tab Bosses của CollectionScene, không ảnh hưởng gameplay
  introText?: string; // đoạn giới thiệu ngắn hiện theo hiệu ứng typewriter trong Boss Intro Cinematic (xem systems/BossIntroController.ts) — không có thì dùng câu mặc định
  introCameraZoom?: number; // mức zoom camera lúc focus vào Boss trong intro — không có thì dùng GAMEPLAY.BOSS_INTRO_DEFAULT_ZOOM
}

/**
 * 1 kỹ năng boss dùng chung được (dash/charge cùng cơ chế lao nhanh, chỉ khác số liệu; ground_slam;
 * summon; roar) — Boss.ts đọc theo `type` để biết chạy state nào, không hardcode riêng cho từng boss.
 */
export interface BossSkillDef {
  id: string;
  name: string; // tên hiển thị (vd "Lao Tới") — dùng cho Collection tab Bosses, xem CollectionManager.getBossEntries()
  type: "dash" | "charge" | "ground_slam" | "summon" | "roar" | "teleport" | "meteor" | "poison_cloud" | "heal_self" | "clone" | "freeze_pulse";
  cooldownMs: number;
  telegraphMs?: number; // dash/charge/ground_slam/meteor
  speed?: number; // dash/charge
  durationMs?: number; // dash/charge (thời lượng lao), roar (thời lượng buff), poison_cloud (thời gian tồn tại mây), clone (thời gian sống), freeze_pulse (thời gian làm chậm player)
  damage?: number; // dash/charge/ground_slam/meteor, poison_cloud (damage mỗi tick)
  radius?: number; // ground_slam/roar/meteor (AOE), teleport (bán kính dịch chuyển quanh player), poison_cloud (bán kính mây), freeze_pulse (bán kính xung)
  count?: number; // summon
  moveSpeedBuff?: number; // roar, vd 0.3 = +30%
  damageBuff?: number; // roar, vd 0.2 = +20%
  tickIntervalMs?: number; // poison_cloud — khoảng cách giữa 2 lần tick damage
  hpThreshold?: number; // heal_self, vd 0.3 = kích hoạt khi HP <= 30% maxHp
  healPercent?: number; // heal_self, vd 0.25 = hồi 25% maxHp
  cloneHp?: number; // clone
  cloneDamage?: number; // clone
  cloneMoveSpeed?: number; // clone
  slowFactor?: number; // freeze_pulse, vd 0.5 = player chậm đi 50% trong durationMs nếu trúng
}

/** 1 map trong bản đồ đảo liên kết (data/maps.json, xem MapSelectScene) — mỗi map có bộ quái + boss cuối riêng. */
export interface MapDef {
  id: string;
  name: string;
  order: number;
  theme_color: string; // hex string, dùng làm màu nền node trên MapSelectScene
  enemyDataFile: string; // tên file trong src/data/ (vd "enemies.json") — resolve qua utils/MapData.ts, không import động trực tiếp
  bossId: string; // tham chiếu bosses.json — boss CUỐI (luôn isFinalBoss: true) của map này, kết thúc map/kích hoạt Victory cinematic
  midBossId?: string; // tham chiếu bosses.json — boss GIỮA map (isFinalBoss: false, giống Loot Chest boss thường), spawn sớm hơn bossId trong cùng ván. Forest/Graveyard không có (chỉ 1 boss/map)
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

/** 1 nhiệm vụ trong 1 ngày của Thử Thách 7 Ngày — nhiều mission cùng "missionType" chia sẻ chung 1 bộ đếm theo ngày (progressByDay), chỉ khác targetValue/rewardStars (kiểu mốc luỹ tiến), xem Challenge7DaysManager.addKillProgress(). */
export interface ChallengeMissionDef {
  id: string;
  name: string;
  missionType: string; // hiện chỉ hỗ trợ "kill_enemies"
  targetValue: number;
  rewardStars: number;
}

/** 1 ngày trong chuỗi Thử Thách 7 Ngày (data/challengeDays.json) — mở TUẦN TỰ theo tiến độ hoàn thành TẤT CẢ mission trong ngày, KHÔNG gắn theo lịch thật (khác DailyRewardDef). */
export interface ChallengeDayDef {
  day: number; // 1-7
  missions: ChallengeMissionDef[]; // 3-4 mission/ngày
}

/** 1 mốc thưởng theo tổng sao tích lũy từ Thử Thách 7 Ngày (data/challengeMilestones.json). rewardType quyết định claimMilestone() thực sự cấp gì — CHỈ tái dùng cơ chế thật đã có (Coin/unlockWeapon/PermanentUpgradeToken), không phát minh hệ thống mới. */
export interface ChallengeMilestoneDef {
  requiredStars: number;
  rewardId: string;
  rewardName: string; // text ĐẦY ĐỦ hiển thị cho người chơi, PHẢI rõ số lượng/tên (vd "100 Coin", "+1 Permanent Upgrade Token") — không chỉ icon
  rewardIcon: string; // "coin" | "weapon" | "token" — key màu icon, xem ui/ChallengeRewardMilestone.ts
  rewardType: "coin" | "weapon_unlock" | "permanent_upgrade_token";
  rewardCoin?: number; // rewardType="coin": số Coin thực nhận; rewardType="weapon_unlock": fallback Coin nếu đã unlock hết vũ khí đặc biệt (giống SaveData.claimLoginReward)
}

/** 1 tab trong CollectionScene — dữ liệu THẬT lấy từ enemies.json/weapons.json/bosses.json/upgrades.json (tái sử dụng, không tạo data trùng), xem CollectionManager. */
export type CollectionTabId = "monsters" | "weapons" | "bosses" | "cards";
