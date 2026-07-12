import Phaser from "phaser";
import { Player } from "@entities/Player";
import upgradesData from "@data/upgrades.json";
import weaponsData from "@data/weapons.json";
import { UpgradeDef, WeaponDef, UpgradeChoice, WeaponChoice } from "@types/index";
import { FusionSystem } from "@systems/FusionSystem";

const upgrades = upgradesData as UpgradeDef[];
const weapons = weaponsData as WeaponDef[];

// Trọng số "vũ khí mới" theo số vũ khí đang equip — ít vũ khí thì ưu tiên cao (dễ có vũ khí thứ 2, thứ 3),
// nhiều vũ khí thì giảm dần để nhường chỗ cho stat upgrade/nâng cấp level.
const NEW_WEAPON_WEIGHT_BY_EQUIPPED_COUNT: Record<number, number> = {
  1: 3,
  2: 2,
  3: 1,
  4: 0.5
  // >=5 (đủ hết weapons.json): không còn trong bảng -> weight 0, không còn vũ khí mới để gợi ý
};
const LEVEL_UP_WEIGHT = 1;
const STAT_WEIGHT = 3;
const MAX_WEAPON_SLOTS_PER_ROLL = 2; // tối đa 2/3 lựa chọn liên quan vũ khí (mới hoặc nâng cấp) trong 1 lần roll

/**
 * Roll 3 lựa chọn khi level up. Nếu FusionSystem báo có công thức khớp, 1 trong 3 slot
 * sẽ ưu tiên là fusion (xem docs/GDD.md mục 6 và sơ đồ trigger đã thống nhất).
 * 2 slot còn lại được roll theo trọng số giữa: vũ khí mới / nâng cấp level vũ khí đã có / stat upgrade thường,
 * giới hạn tối đa MAX_WEAPON_SLOTS_PER_ROLL slot liên quan vũ khí để tránh dồn dập đầu game.
 */
export class UpgradeSystem {
  constructor(private player: Player, private fusionSystem: FusionSystem) {}

  rollChoices(): UpgradeChoice[] {
    const choices: UpgradeChoice[] = [];

    const availableFusion = this.fusionSystem.checkAvailableFusion(this.player);
    if (availableFusion) {
      choices.push({ fusion: true, fusionId: availableFusion.id });
    }

    const equippedActive = this.player.equippedWeapons.filter((w) => !w.fusedInto);
    const newWeaponWeight = NEW_WEAPON_WEIGHT_BY_EQUIPPED_COUNT[equippedActive.length] ?? 0;

    const newWeaponPool: UpgradeChoice[] = Phaser.Utils.Array.Shuffle(
      weapons
        .filter((w) => !equippedActive.some((e) => e.weaponId === w.id))
        .map((w): WeaponChoice => ({ weapon: true, weaponId: w.id, isNew: true }))
    );

    const levelUpPool: UpgradeChoice[] = Phaser.Utils.Array.Shuffle(
      equippedActive
        .filter((e) => {
          const def = weapons.find((w) => w.id === e.weaponId);
          return def !== undefined && e.level < def.maxLevel;
        })
        .map((e): WeaponChoice => ({ weapon: true, weaponId: e.weaponId, isNew: false }))
    );

    const statPool: UpgradeChoice[] = Phaser.Utils.Array.Shuffle([...upgrades]);

    let weaponSlotsUsed = 0;
    while (choices.length < 3) {
      const capWeapon = weaponSlotsUsed >= MAX_WEAPON_SLOTS_PER_ROLL;
      const candidates = [
        { pool: newWeaponPool, weight: capWeapon ? 0 : newWeaponWeight, isWeapon: true },
        { pool: levelUpPool, weight: capWeapon ? 0 : LEVEL_UP_WEIGHT, isWeapon: true },
        { pool: statPool, weight: STAT_WEIGHT, isWeapon: false }
      ].filter((c) => c.pool.length > 0 && c.weight > 0);

      if (candidates.length === 0) break; // hết lựa chọn khả dụng, rất hiếm khi xảy ra

      const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
      let roll = Phaser.Math.FloatBetween(0, totalWeight);
      let picked = candidates[candidates.length - 1];
      for (const c of candidates) {
        if (roll < c.weight) {
          picked = c;
          break;
        }
        roll -= c.weight;
      }

      choices.push(picked.pool.pop() as UpgradeChoice);
      if (picked.isWeapon) weaponSlotsUsed += 1;
    }

    return choices;
  }

  applyUpgrade(def: UpgradeDef): void {
    const current = this.player.stats[def.stat] ?? 0;
    this.player.stats[def.stat] = current + def.value;
    this.player.appliedUpgrades.push(def.id); // xem PauseScene — hiện icon loadout đã chọn trong ván
    // TODO: nếu def.appliesTo tồn tại (ví dụ fireball_size chỉ áp cho fireball) -> lưu riêng thay vì ghi đè stats chung
  }

  applyWeaponChoice(choice: WeaponChoice): void {
    if (choice.isNew) {
      this.player.equippedWeapons.push({ weaponId: choice.weaponId, level: 1 });
      return;
    }

    const equipped = this.player.equippedWeapons.find((w) => w.weaponId === choice.weaponId && !w.fusedInto);
    const def = weapons.find((w) => w.id === choice.weaponId);
    if (equipped && def) {
      equipped.level = Math.min(equipped.level + 1, def.maxLevel);
    }
  }
}
