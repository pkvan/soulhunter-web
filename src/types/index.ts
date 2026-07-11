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
