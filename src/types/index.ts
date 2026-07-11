export interface WeaponDef {
  id: string;
  name: string;
  type: "melee" | "projectile_straight" | "projectile_pierce" | "random_target" | "projectile_return";
  baseDamage: number;
  baseCooldownMs: number;
  maxLevel: number;
  description: string;
  [key: string]: unknown;
}

export interface UpgradeDef {
  id: string;
  name: string;
  stat: string;
  value: number;
  stackable: boolean;
  appliesTo?: string;
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

export interface BossDef {
  id: string;
  name: string;
  color: string; // hex string (vd "0xd1d5db") — Boss tint sprite + màu HP bar/banner theo giá trị này
  hp: number;
  moveSpeed: number;
  skillIds: string[]; // tham chiếu tới bossSkills.json; thứ tự trong mảng = thứ tự ưu tiên khi nhiều skill cùng hết cooldown
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

export interface RunResult {
  survivalTimeMs: number;
  kills: number;
  coinEarned: number;
  highestCombo: number;
  victory?: boolean; // true khi hạ được Boss, false/undefined = Game Over thường (HP về 0)
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
