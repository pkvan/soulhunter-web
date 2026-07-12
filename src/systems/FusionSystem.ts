import Phaser from "phaser";
import { Player } from "@entities/Player";
import fusionsData from "@data/fusions.json";
import weaponsData from "@data/weapons.json";
import upgradesData from "@data/upgrades.json";
import { FusionDef, WeaponDef, UpgradeDef } from "@types/index";

const fusions = fusionsData as FusionDef[];
const weapons = weaponsData as WeaponDef[];
const upgrades = upgradesData as UpgradeDef[];

/**
 * Cơ chế đặc trưng của game (xem docs/GDD.md mục 6). Điều kiện:
 * 1. Một vũ khí đang equip đạt maxLevel
 * 2. Player đang sở hữu vũ khí/status thứ hai trong công thức
 * 3. Vũ khí đó chưa từng fusion (equipped.fusedInto === undefined)
 */
export class FusionSystem {
  checkAvailableFusion(player: Player): FusionDef | null {
    const maxedWeapons = player.equippedWeapons.filter((w) => {
      const def = weapons.find((wd) => wd.id === w.weaponId);
      return def && w.level >= def.maxLevel && !w.fusedInto;
    });

    const candidates: FusionDef[] = [];
    for (const maxed of maxedWeapons) {
      for (const fusion of fusions) {
        if (!fusion.requires.includes(maxed.weaponId)) continue;
        const otherId = fusion.requires.find((id) => id !== maxed.weaponId);
        if (!otherId) continue;

        if (this.hasRequirement(player, otherId)) candidates.push(fusion);
      }
    }

    if (candidates.length === 0) return null;
    return Phaser.Utils.Array.GetRandom(candidates);
  }

  /**
   * 1 vế công thức có thể là weaponId (đã equip) hoặc id của 1 stat upgrade đã nhặt
   * (vd "poison", "burn", "life_steal", "freeze_chance" trong upgrades.json) — khác weapon,
   * các stat này không bị "tiêu hao" khi fusion vì chúng là stat chung của player, không phải slot vũ khí.
   */
  private hasRequirement(player: Player, id: string): boolean {
    const isEquippedWeapon = player.equippedWeapons.some((w) => w.weaponId === id);
    if (isEquippedWeapon) return true;

    const upgradeDef = upgrades.find((u) => u.id === id);
    if (!upgradeDef) return false;
    return (player.stats[upgradeDef.stat] ?? 0) > 0;
  }

  applyFusion(player: Player, fusion: FusionDef): void {
    // Xóa 2 vũ khí gốc (chỉ những vế là weapon thật sự bị tiêu hao; vế là stat upgrade giữ nguyên)
    player.equippedWeapons = player.equippedWeapons.filter(
      (w) => !fusion.requires.includes(w.weaponId)
    );
    player.equippedWeapons.push({ weaponId: fusion.id, level: 1, fusedInto: fusion.id });
    player.syncSwordHpBonus(); // Sword có thể vừa bị "nuốt" làm nguyên liệu fusion -> trừ lại đúng bonus HP
  }
}
